import { test, expect } from "@playwright/test";

test("homepage renders the title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/AFENDA/);
});
