import { expect, test } from "@playwright/test";

import dvaQuestions from "../content/aws/dva-c02/questions.json";

// The critical user journey (SPECIFICATIONS.md §7): onboarding → quiz →
// dashboard. Runs against the throwaway SQLite database configured in
// playwright.config.ts, recreated fresh on every run — each test continues
// the story of the previous one, so tests must run serially in this file.
//
// Only one certification (aws/dva-c02) is currently in /content, so the
// "track an additional certification from the dashboard" step from the
// original journey is dropped until a second certification's content
// exists — see git history for the previous version of this file.

test.describe.configure({ mode: "serial" });

test("fresh database redirects the first visit to /onboarding", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Set up your practice space" }),
  ).toBeVisible();
});

test("submitting without filling anything shows validation errors", async ({
  page,
}) => {
  await page.goto("/onboarding");

  await page.getByRole("button", { name: "Start practicing" }).click();

  await expect(page.getByText("Please enter your name.")).toBeVisible();
  await expect(page.getByText("Please enter your job title.")).toBeVisible();
  await expect(
    page.getByText("Select at least one certification to track."),
  ).toBeVisible();
});

test("completing onboarding stores the profile and leads to the dashboard", async ({
  page,
}) => {
  await page.goto("/onboarding");

  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Job title").fill("Cloud Engineer");
  await page
    .getByRole("checkbox", { name: /AWS Certified Developer - Associate/ })
    .click();
  await page.getByRole("button", { name: "Start practicing" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back, Ada Lovelace" }),
  ).toBeVisible();
  await expect(
    page.getByText("AWS Certified Developer - Associate"),
  ).toBeVisible();
});

test("onboarding is never shown again once completed", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});

// Step 5/10: the quiz leg of the critical flow. The spec imports the real
// question bank so it can look up whichever question the app actually
// shows and answer it correctly, then assert the exact progress the
// dashboard must show afterward. The bank (449 questions) is far too large
// to walk in full inside a browser test, so the session uses the app's
// real "20 random" batch option rather than "All questions" — this also
// means question order isn't known ahead of time, so each question is
// looked up by its rendered text instead of by index. Answer inputs are
// visually-hidden radios/checkboxes, so options are clicked via their
// label text.
test("a full practice session is graded and reflected on the dashboard", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const SESSION_SIZE = 20;

  await page.goto("/dashboard");

  const dvaCard = page
    .getByTestId("certification-card")
    .filter({ hasText: "AWS Certified Developer - Associate" });

  await dvaCard.getByRole("link", { name: "Practice" }).click();
  await expect(page).toHaveURL(/\/certifications\/dva-c02\/quiz$/);

  // On a fresh profile every question counts as "not yet mastered", so that
  // option is preselected by default — pick the random 20-question batch
  // explicitly instead.
  await page.getByText(`${SESSION_SIZE} random`, { exact: true }).click();
  await page.getByRole("button", { name: "Start session" }).click();

  for (let index = 0; index < SESSION_SIZE; index++) {
    await expect(
      page.getByText(`Question ${index + 1}/${SESSION_SIZE}`),
    ).toBeVisible();

    const questionText = await page
      .getByRole("heading", { level: 2 })
      .textContent();
    const question = dvaQuestions.find((q) => q.question === questionText);

    if (!question) {
      throw new Error(
        `Rendered question not found in the bank: ${questionText}`,
      );
    }

    for (const correctId of question.correctOptionIds) {
      const option = question.options.find(
        (candidate) => candidate.id === correctId,
      )!;

      await page.getByText(option.text, { exact: true }).click();
    }

    await page.getByRole("button", { name: "Submit answer" }).click();
    await expect(page.getByText("✓ Correct")).toBeVisible();

    await page
      .getByRole("button", {
        name:
          index + 1 === SESSION_SIZE ? "View session report" : "Next question",
      })
      .click();
  }

  // Session report: all answers correct.
  await expect(page.getByText(`${SESSION_SIZE}/${SESSION_SIZE}`)).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText("Exam-ready pace")).toBeVisible();

  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // The dashboard reflects the persisted attempts immediately. 20 correct
  // out of the full 449-question bank is nowhere near the mastery
  // threshold, so the status stays "In progress" rather than "Exam ready".
  await expect(
    dvaCard.getByText(`${SESSION_SIZE}/${dvaQuestions.length} correct`),
  ).toBeVisible();
  await expect(dvaCard.getByText("In progress", { exact: true })).toBeVisible();
});

// Audit A11Y-01/02/08: the quiz was the app's least accessible screen — the
// grade was carried by the green/red pair alone, and remounting the card on
// every question dropped keyboard focus to <body>. These are silent
// regressions by nature (nothing looks broken), so they are pinned here.
test("the quiz is navigable and gradeable without relying on colour", async ({
  page,
}) => {
  await page.goto("/dashboard");

  // Skip link: clipped to a 1px box until focused, then laid out for real.
  // It is deliberately NOT display:none — it has to stay in the
  // accessibility tree, which is why this asserts on geometry rather than
  // Playwright's visibility (sr-only elements count as visible).
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  const clipped = await skipLink.boundingBox();
  expect(clipped!.width).toBeLessThanOrEqual(1);

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  const expanded = await skipLink.boundingBox();
  expect(expanded!.width).toBeGreaterThan(50);

  // And it has to actually reach the content.
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.location.hash)).toBe("#main-content");

  await page.goto("/certifications/dva-c02/quiz");
  await page.getByText("20 random", { exact: true }).click();
  await page.getByRole("button", { name: "Start session" }).click();

  // Focus lands on the question stem, not on <body>. Polled rather than read
  // once: the session now starts on a real navigation (the batch travels in
  // the URL), so the focus effect runs after hydration.
  const expectStemFocused = () =>
    expect
      .poll(() => page.evaluate(() => document.activeElement?.tagName))
      .toBe("H2");

  await expect(page.getByText("Question 1/20")).toBeVisible();
  await expectStemFocused();

  const questionText = await page
    .getByRole("heading", { level: 2 })
    .textContent();
  const question = dvaQuestions.find((q) => q.question === questionText)!;

  // Every correct option, not just the first: a "(Choose TWO)" question keeps
  // Submit disabled until the required number is pencilled in.
  for (const correctId of question.correctOptionIds) {
    const option = question.options.find((o) => o.id === correctId)!;
    await page.getByText(option.text, { exact: true }).click();
  }

  await page.getByRole("button", { name: "Submit answer" }).click();

  // The grade survives greyscale: a ✓ glyph on the row and a text
  // equivalent in the accessible name.
  await expect(page.getByText("✓", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("— Correct answer.", { exact: false }).first(),
  ).toBeAttached();

  // Advancing remounts the card; focus must follow to the new stem.
  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByText("Question 2/20")).toBeVisible();
  await expectStemFocused();
});

// Audit DS-01 / SPECIFICATIONS.md §6.1: the theme control the CSS had
// promised since Step 4. Three states, and "System" has to be a real one —
// meaning no data-theme attribute at all, so the stylesheet's
// `color-scheme: light dark` follows the OS.
test("the appearance control switches theme and keeps System as a real state", async ({
  page,
}) => {
  await page.goto("/settings");

  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme");

  await page.getByText("Dark", { exact: true }).click();
  await page.getByRole("button", { name: "Apply theme" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");

  // The attribute is written by the root layout, so it must survive a
  // navigation to any other screen, not just persist on /settings.
  await page.goto("/dashboard");
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.goto("/settings");
  await page.getByText("System", { exact: true }).click();
  await page.getByRole("button", { name: "Apply theme" }).click();
  await expect(html).not.toHaveAttribute("data-theme");
});

test("the appearance control works with JavaScript disabled", async ({
  browser,
}) => {
  // The whole reason this is a cookie and a form rather than localStorage and
  // a click handler (DESIGN.md Lot 9 amendment). If this ever fails, the
  // control silently became a widget.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    await page.goto("/settings");
    await page.getByText("Light", { exact: true }).click();
    await page.getByRole("button", { name: "Apply theme" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  } finally {
    await context.close();
  }
});

// Audit FE-04: notFound() had no custom UI, so these routes fell through to
// Next's unstyled default page. Both the notFound() calls inside the app and
// a URL matching no route at all resolve to the same screen.
test("unknown certifications and unmatched URLs land on the branded 404", async ({
  page,
}) => {
  await page.goto("/certifications/does-not-exist");
  await expect(page.getByText("404 · No record")).toBeVisible();

  // The way out has to actually work, otherwise the page is a dead end in
  // the literal sense.
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Same screen for a route the app does not define at all.
  await page.goto("/no-such-page");
  await expect(page.getByText("404 · No record")).toBeVisible();

  // And for stale query links the quiz route rejects: an unknown domain, and
  // a batch size the setup screen never offers (audit FE-01 put the batch in
  // the URL, so it has to be validated like any other input).
  await page.goto("/certifications/dva-c02/quiz?domain=not-a-domain");
  await expect(page.getByText("404 · No record")).toBeVisible();

  await page.goto("/certifications/dva-c02/quiz?batch=random-999");
  await expect(page.getByText("404 · No record")).toBeVisible();
});
