import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("auth signin route responds", async ({ page }) => {
  await page.goto("/auth/signin", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/signin/);
});

test("signin page renders core controls", async ({ page }) => {
  await page.goto("/auth/signin", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("verify page renders MFA input", async ({ page }) => {
  await page.goto("/auth/verify", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/one-time password/i).first()).toBeVisible();
});

test("portal route redirects to signin when unauthenticated", async ({ page }) => {
  await page.goto("/portal/supplier", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/portal\/supplier\/signin|\/auth\/signin|\/portal\/supplier/);
  await expect(page.getByLabel(/email/i)).toBeVisible();
});
