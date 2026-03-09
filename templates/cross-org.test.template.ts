/**
 * templates/cross-org.test.template.ts
 *
 * Template for cross-organization isolation tests.
 *
 * USAGE:
 *   Copy this pattern into every integration test that touches multi-tenant data.
 *   The org-isolation gate will fail if multi-tenant tests don't verify isolation.
 *
 * MULTI-TENANT TABLES:
 *   invoice, supplier, journal_entry, evidence, org_setting,
 *   iam_principal, iam_role, iam_role_permission, iam_principal_role
 *
 * PATTERN:
 *   1. Create resource in Org A
 *   2. Attempt access from user in Org B
 *   3. Assert 403 Forbidden (or 404 to prevent enumeration)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  createTestApp,
  injectAs,
  resetDb,
  closeApp,
} from "../__vitest_test__/helpers/app-factory.js";

/**
 * Example: Invoice service org isolation
 */
describe("invoice service - org isolation", () => {
  let app: FastifyInstance;
  let orgAInvoiceId: string;
  let orgASupplierId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Get supplier ID for Org A
    orgASupplierId = await getTestSupplierId(app);

    // Create invoice in Org A
    const submitRes = await injectAs(app, "submitter-org-a@example.com", {
      method: "POST",
      url: "/v1/commands/submit-invoice",
      payload: {
        supplierId: orgASupplierId,
        invoiceNumber: "INV-ORG-A-001",
        amountMinor: 100000n,
        currencyCode: "USD",
        dueDate: "2026-04-01",
      },
    });

    expect(submitRes.statusCode).toBe(201);
    orgAInvoiceId = submitRes.json().data.id;
  });

  afterEach(async () => {
    if (app) await resetDb(app);
  });

  afterAll(async () => {
    if (app) await closeApp(app);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ CROSS-ORG ISOLATION TESTS (REQUIRED)
  // ─────────────────────────────────────────────────────────────────────────

  it("rejects GET request to different org's invoice", async () => {
    const res = await injectAs(app, "user-org-b@example.com", {
      method: "GET",
      url: `/v1/invoices/${orgAInvoiceId}`,
    });

    // Should return 403 Forbidden or 404 Not Found (to prevent org enumeration)
    expect([403, 404]).toContain(res.statusCode);

    if (res.statusCode === 403) {
      expect(res.json().error?.code).toBe("FORBIDDEN");
    }
  });

  it("rejects approval from different org's approver", async () => {
    const res = await injectAs(app, "approver-org-b@example.com", {
      method: "POST",
      url: "/v1/commands/approve-invoice",
      payload: {
        invoiceId: orgAInvoiceId,
        idempotencyKey: "approve-cross-org-test-001",
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error?.code).toBe("FORBIDDEN");
  });

  it("rejects rejection from different org's user", async () => {
    const res = await injectAs(app, "user-org-b@example.com", {
      method: "POST",
      url: "/v1/commands/reject-invoice",
      payload: {
        invoiceId: orgAInvoiceId,
        reason: "Attempting cross-org access",
        idempotencyKey: "reject-cross-org-test-001",
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects listing invoices with cross-org query injection attempt", async () => {
    // Attempt to inject org filter bypass
    const res = await injectAs(app, "user-org-b@example.com", {
      method: "GET",
      url: `/v1/invoices?orgId=${getOrgId(app, "org-a")}`, // Should be ignored
    });

    expect(res.statusCode).toBe(200);
    const { data } = res.json();

    // Should only see Org B invoices (none in this test), not Org A
    expect(data.items).toEqual([]);
    expect(data.items).not.toContainEqual(
      expect.objectContaining({ id: orgAInvoiceId })
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ADDITIONAL TESTS (service-specific functionality)
  // ─────────────────────────────────────────────────────────────────────────

  it("allows Org A user to access their own invoice", async () => {
    const res = await injectAs(app, "submitter-org-a@example.com", {
      method: "GET",
      url: `/v1/invoices/${orgAInvoiceId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe(orgAInvoiceId);
  });
});

// ─── Helper Functions (adjust based on your test setup) ──────────────────────

async function getTestSupplierId(app: FastifyInstance): Promise<string> {
  // Implementation depends on your test setup
  // Example: query suppliers table or use factory
  const result = await app.db.execute(
    /* sql */ `SELECT id FROM supplier LIMIT 1`
  );
  return result.rows[0]?.id || "default-supplier-id";
}

function getOrgId(app: FastifyInstance, orgName: string): string {
  // Return org ID based on test org name
  // Implementation depends on your test setup
  return orgName === "org-a" ? "org-a-id" : "org-b-id";
}

// ─── CHECKLIST FOR ADDING CROSS-ORG TESTS ────────────────────────────────────
//
// ✅ 1. Create resource in Org A
// ✅ 2. Attempt read from Org B user → expect 403/404
// ✅ 3. Attempt write/update from Org B user → expect 403
// ✅ 4. Attempt delete from Org B user → expect 403
// ✅ 5. Verify list queries don't leak cross-org data
// ✅ 6. Test with both explicit org ID injection and session-based filtering
// ✅ 7. Verify own-org access still works (positive control)
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ANTI-PATTERNS TO AVOID:
 *
 * ❌ DON'T skip org isolation tests for "internal" tables
 *    → Even admin tables need isolation (iam_principal, etc.)
 *
 * ❌ DON'T test only happy paths
 *    → Attackers probe unauthorized access, not normal workflows
 *
 * ❌ DON'T assume framework-level RLS is enough
 *    → Always verify in integration tests
 *
 * ❌ DON'T use the same org for both test users
 *    → Test must use genuinely different orgs
 *
 * ❌ DON'T return generic errors
 *    → 403 with error code "FORBIDDEN" is clearer than 400 "Bad Request"
 */

/**
 * SECURITY BEST PRACTICES:
 *
 * ✅ Return 404 instead of 403 for sensitive resources to prevent enumeration
 * ✅ Log attempted cross-org access for security monitoring
 * ✅ Test query parameter injection (orgId in filters)
 * ✅ Test path parameter manipulation (/v1/orgs/{orgId}/resources)
 * ✅ Test with multiple permission levels (viewer, editor, admin)
 * ✅ Verify audit logs capture attempted access and rejection
 */
