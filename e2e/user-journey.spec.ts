import { expect, test } from "@playwright/test";

import awsQuestions from "../content/aws/clf-c02/questions.json";
import kcnaQuestions from "../content/cncf/kcna/questions.json";

// The critical user journey (SPECIFICATIONS.md §7): onboarding → quiz →
// dashboard. Runs against the throwaway SQLite database configured in
// playwright.config.ts, recreated fresh on every run — each test continues
// the story of the previous one, so tests must run serially in this file.

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
    .getByRole("checkbox", { name: /AWS Certified Cloud Practitioner/ })
    .click();
  await page.getByRole("button", { name: "Start practicing" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back, Ada Lovelace" }),
  ).toBeVisible();
  await expect(
    page.getByText("AWS Certified Cloud Practitioner"),
  ).toBeVisible();
});

test("onboarding is never shown again once completed", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});

// Step 4: tracking an extra certification from the dashboard, without
// re-running onboarding.
test("a certification can be added from the dashboard and appears immediately", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByText("1 certification tracked")).toBeVisible();

  await page.getByRole("button", { name: "Track certification" }).click();
  await page
    .getByRole("checkbox", { name: /Kubernetes and Cloud Native Associate/ })
    .click();
  await page.getByRole("button", { name: "Start tracking" }).click();

  await expect(page.getByText("2 certifications tracked")).toBeVisible();
  await expect(
    page.getByText("Kubernetes and Cloud Native Associate"),
  ).toBeVisible();
  // Both certifications now tracked: the dialog has nothing left to offer.
  await expect(
    page.getByRole("button", { name: "All certifications tracked" }),
  ).toBeDisabled();
});

// Step 5/10: the quiz leg of the critical flow. The spec imports the real
// question bank, so it can answer every question correctly and assert the
// exact progress the dashboard must show afterward. Answer inputs are
// visually-hidden radios/checkboxes, so options are clicked via their label
// text (verified unique within the KCNA bank).
test("a full practice session is graded and reflected on the dashboard", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await page.goto("/dashboard");

  const kcnaCard = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Kubernetes and Cloud Native Associate" });

  await kcnaCard.getByRole("link", { name: "Practice" }).click();
  await expect(page).toHaveURL(/\/certifications\/kcna\/quiz$/);

  // "Not yet mastered" is preselected on a fresh profile; picking "All
  // questions" makes the session order deterministic (bank order).
  await page.getByText("All questions", { exact: true }).click();
  await page.getByRole("button", { name: "Start session" }).click();

  for (const [index, question] of kcnaQuestions.entries()) {
    await expect(
      page.getByText(`Question ${index + 1}/${kcnaQuestions.length}`),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: question.question }),
    ).toBeVisible();

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
          index + 1 === kcnaQuestions.length
            ? "View session report"
            : "Next question",
      })
      .click();
  }

  // Session report: all answers correct.
  await expect(
    page.getByText(`${kcnaQuestions.length}/${kcnaQuestions.length}`),
  ).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText("Exam-ready pace")).toBeVisible();

  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // The dashboard reflects the persisted attempts immediately.
  await expect(
    kcnaCard.getByText(
      `${kcnaQuestions.length}/${kcnaQuestions.length} correct`,
    ),
  ).toBeVisible();
  await expect(kcnaCard.getByText("Exam ready", { exact: true })).toBeVisible();

  // The other tracked certification is untouched.
  const awsCard = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "AWS Certified Cloud Practitioner" });

  await expect(
    awsCard.getByText(`0/${awsQuestions.length} correct`),
  ).toBeVisible();
});
