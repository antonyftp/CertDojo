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
    .locator('[data-slot="card"]')
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
