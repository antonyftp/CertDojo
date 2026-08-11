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
    page.getByRole("heading", { name: "Welcome, Ada Lovelace" }),
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
