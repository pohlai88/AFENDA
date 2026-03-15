import { test, expect } from "@playwright/test";

const requiresApi = process.env.PLAYWRIGHT_REQUIRE_API === "1";
const requiresAdminAuth = process.env.PLAYWRIGHT_REQUIRE_ADMIN_AUTH === "1";
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

function expectUnauthenticatedMutationDenied(status: number) {
  expect([401, 403, 500]).toContain(status);
}

async function signInAsAdmin(page: Parameters<typeof test>[1]["page"]) {
  if (!adminEmail || !adminPassword) {
    throw new Error("Missing PLAYWRIGHT_ADMIN_EMAIL or PLAYWRIGHT_ADMIN_PASSWORD.");
  }

  await page.goto("/auth/sign-in?next=%2Fapp", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);

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

test.describe("admin API guards", () => {
  test.skip(
    !requiresApi,
    "Set PLAYWRIGHT_REQUIRE_API=1 and run web+api services to validate admin guard responses.",
  );

  test("select-organization redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/auth/select-organization?next=%2Fapp", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 30_000 });
  });

  test("critical admin mutations are forbidden when unauthenticated", async ({ request }) => {
    const roleResponse = await request.post("/api/internal/admin/users/test-user/role", {
      data: { role: "member" },
    });
    expectUnauthenticatedMutationDenied(roleResponse.status());

    const passwordResponse = await request.post("/api/internal/admin/users/test-user/password", {
      data: { newPassword: "temporary-password" },
    });
    expectUnauthenticatedMutationDenied(passwordResponse.status());

    const revokeResponse = await request.post(
      "/api/internal/admin/users/test-user/sessions/revoke",
    );
    expectUnauthenticatedMutationDenied(revokeResponse.status());

    const removeResponse = await request.delete("/api/internal/admin/users/test-user");
    expectUnauthenticatedMutationDenied(removeResponse.status());
  });

  test("critical admin mutations are not rejected as unauthenticated when admin session exists", async ({ page }) => {
    test.skip(
      !requiresAdminAuth,
      "Set PLAYWRIGHT_REQUIRE_ADMIN_AUTH=1 with PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD to run authenticated admin mutation checks.",
    );
    test.skip(
      !adminEmail || !adminPassword,
      "Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD to run authenticated admin mutation checks.",
    );

    await signInAsAdmin(page);

    const roleResponse = await page.request.post("/api/internal/admin/users/test-user/role", {
      data: { role: "member" },
    });
    expect(roleResponse.status()).not.toBe(401);
    expect(roleResponse.status()).not.toBe(403);

    const passwordResponse = await page.request.post(
      "/api/internal/admin/users/test-user/password",
      {
        data: { newPassword: "temporary-password" },
      },
    );
    expect(passwordResponse.status()).not.toBe(401);
    expect(passwordResponse.status()).not.toBe(403);

    const revokeResponse = await page.request.post(
      "/api/internal/admin/users/test-user/sessions/revoke",
    );
    expect(revokeResponse.status()).not.toBe(401);
    expect(revokeResponse.status()).not.toBe(403);

    const removeResponse = await page.request.delete("/api/internal/admin/users/test-user");
    expect(removeResponse.status()).not.toBe(401);
    expect(removeResponse.status()).not.toBe(403);
  });
});
