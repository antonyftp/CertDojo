import { expect, test } from "@playwright/test";

test("home page shows the starter stack", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Open-source Next.js starter for certification prep workflows.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add session" }).click();

  await expect(page.getByText("2")).toBeVisible();
});
