import { expect, test } from "@playwright/test";

// Runs against the throwaway SQLite database configured in
// playwright.config.ts, recreated fresh on every run — the flow below
// covers the Step 3 validation criteria in order, so tests must run
// serially in this file.

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
