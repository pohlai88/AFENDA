import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const requiresAuthLifecycle = process.env.PLAYWRIGHT_REQUIRE_AUTH_LIFECYCLE === "1";
const authEmail = process.env.PLAYWRIGHT_AUTH_EMAIL;
const authPassword = process.env.PLAYWRIGHT_AUTH_PASSWORD;

async function signInWithEmailPassword(page: Parameters<typeof test>[1]["page"]) {
  if (!authEmail || !authPassword) {
    throw new Error("Missing PLAYWRIGHT_AUTH_EMAIL or PLAYWRIGHT_AUTH_PASSWORD.");
  }

  await page.goto("/auth/sign-in?next=%2Fapp", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(authEmail);
  await page.getByLabel(/password/i).fill(authPassword);

  await Promise.all([
    page.waitForURL(/\/auth\/post-sign-in|\/app|\/auth\/select-organization/, {
      timeout: 30_000,
    }),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);

  if (/\/auth\/post-sign-in/.test(page.url())) {
    await page.waitForURL(/\/app|\/auth\/select-organization/, { timeout: 30_000 });
  }
}

test("auth sign-in route responds", async ({ page }) => {
  await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("signin page renders core controls", async ({ page }) => {
  await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
});

test("forgot-password page renders recovery controls", async ({ page }) => {
  await page.goto("/auth/forgot-password", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/reset your password/i)).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
});

test("otp sign-in page renders code flow controls", async ({ page }) => {
  await page.goto("/auth/sign-in-otp", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/sign in with email code/i)).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /send sign-in code/i })).toBeVisible();
});

test("verify-email page renders verification actions", async ({ page }) => {
  await page.goto("/auth/verify-email", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/^verify your email$/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /resend verification email/i })).toBeVisible();
});

test.describe("authenticated auth lifecycle", () => {
  test.skip(
    !requiresAuthLifecycle,
    "Set PLAYWRIGHT_REQUIRE_AUTH_LIFECYCLE=1 with PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD to run authenticated lifecycle smoke.",
  );

  test("authenticated user can reach security settings account lifecycle panels", async ({ page }) => {
    test.skip(
      !authEmail || !authPassword,
      "Set PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD to run authenticated lifecycle smoke.",
    );

    await signInWithEmailPassword(page);

    await page.goto("/governance/settings/security", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^security$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^account info$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^profile$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^change email$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^delete account$/i })).toBeVisible();
  });
});
