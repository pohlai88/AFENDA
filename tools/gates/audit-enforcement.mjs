#!/usr/bin/env node
/**
 * tools/gates/audit-enforcement.mjs
 *
 * CI gate: ensures every state-changing command test verifies audit log creation.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. AUDIT_LOG_ASSERTION_MISSING — A test file that calls command routes
 *     (submit-invoice, approve-invoice, post-to-gl, etc.) does not verify
 *     that an audit_log row was created.
 *
 * Usage:
 *   node tools/gates/audit-enforcement.mjs
 *
 * Philosophy:
 *   Every state change MUST be auditable for compliance. Tests that verify
 *   commands work but don't verify audit logs give false confidence.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const TEST_DIR = resolve(ROOT, "apps/api/src/__vitest_test__");

/**
 * Test files excluded from audit enforcement (legitimate reasons):
 * - Dedicated audit test files (already comprehensively test audit)
 * - Tests focused on other concerns (pagination, balancing, SOD, idempotency, org-isolation)
 * - Setup/helper files
 */
const EXCLUDED_FILES = [
  "audit-completeness.test.ts", // Comprehensively tests audit log creation
  "audit-queries.test.ts", // Tests audit log queries
  "cursor-pagination.test.ts", // Tests pagination, uses commands as fixture
  "journal-balance.test.ts", // Tests ledger balance invariant
  "sequence-gap-free.test.ts", // Tests sequence number generation
  "cross-org-isolation.test.ts", // Tests org isolation, not audit
  "idempotency.test.ts", // Tests idempotency, not audit
  "invoice-lifecycle.test.ts", // Tests lifecycle traceability
  "mark-paid.test.ts", // Tests mark-paid workflow
  "sod-enforcement.test.ts", // Tests segregation of duties
  "global-setup.ts",
  "helpers",
  "factories",
];

/**
 * Command route patterns that represent state-changing operations.
 * These MUST have audit log verification in their tests.
 */
const COMMAND_ROUTE_PATTERNS = [
  /\/v1\/commands\//,
  /submit-invoice/,
  /approve-invoice/,
  /reject-invoice/,
  /post-to-gl/,
  /create-supplier/,
  /update-supplier/,
  /create-evidence/,
];

/**
 * Patterns indicating audit log verification in test.
 */
const AUDIT_LOG_ASSERTION_PATTERNS = [
  /audit[_-]?log/i,
  /auditLog/,
  /from\s*\(\s*audit/i,
  /\.action\s*=/,
  /\.entity[_-]?type/i,
  /\.actor[_-]?id/i,
];

// ─── Rule Documentation ──────────────────────────────────────────────────────

const RULE_DOCS = {
  AUDIT_LOG_ASSERTION_MISSING: {
    why: "Every state-changing command must create an audit log for compliance and accountability. Tests that don't verify audit logs can miss critical governance failures.",
    docs: "See docs/ci-gates-evaluation.md — Section 4.2: Audit Enforcement",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "AUDIT_LOG_ASSERTION_MISSING":
      return `Add audit log assertion to ${ctx.file}:

  it("${ctx.testName || 'command creates audit log'}", async () => {
    // Execute command
    const res = await injectAs(app, ACTOR_EMAIL, {
      method: "POST",
      url: "${ctx.route || '/v1/commands/...'}",
      payload: { ... }
    });
    
    expect(res.statusCode).toBe(200); // or 201
    
    // ✅ Verify audit log was created
    const auditLogs = await app.db.select()
      .from(auditLog)
      .where(eq(auditLog.entityId, entityId));
    
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe("entity.action");
    expect(auditLogs[0].actorId).toBe(actorId);
  });

See apps/api/src/__vitest_test__/audit-completeness.test.ts for examples.`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if file contains command route calls.
 */
function hasCommandRouteCalls(content) {
  return COMMAND_ROUTE_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Check if file contains audit log assertions.
 */
function hasAuditLogAssertions(content) {
  return AUDIT_LOG_ASSERTION_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Extract command routes referenced in test.
 */
function extractCommandRoutes(content) {
  const routes = [];
  const routeRegex = /url:\s*["'`]([^"'`]*\/commands\/[^"'`]+)["'`]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push(match[1]);
  }
  return routes;
}

// ─── Main Gate Logic ─────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];

if (!existsSync(TEST_DIR)) {
  console.warn(`⚠ Test directory not found: ${TEST_DIR}`);
  console.warn("  Gate will pass but should be run from monorepo root.");
  process.exit(0);
}

const testFiles = walkTs(TEST_DIR);
let scannedWithCommands = 0;

for (const file of testFiles) {
  const content = readFileSync(file, "utf-8");
  const relPath = relative(ROOT, file);
  // Skip excluded files
  if (EXCLUDED_FILES.some((pattern) => relPath.includes(pattern))) {
    continue;
  }
  // Skip if file doesn't test command routes
  if (!hasCommandRouteCalls(content)) {
    continue;
  }

  scannedWithCommands++;

  // Check if file includes audit log assertions
  if (!hasAuditLogAssertions(content)) {
    const routes = extractCommandRoutes(content);
    violations.push({
      ruleCode: "AUDIT_LOG_ASSERTION_MISSING",
      file: relPath,
      message: `Test calls command routes but does not verify audit log creation`,
      meta: {
        routes: routes.length > 0 ? routes : ["(routes detected but not extracted)"],
      },
    });
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

if (violations.length > 0) {
  reportViolations({
    gateName: "AUDIT ENFORCEMENT",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Test files scanned:": testFiles.length,
      "Command tests:": scannedWithCommands,
    },
    elapsed,
  });
  process.exit(1);
}

reportSuccess({
  gateName: `audit enforcement complete — ${scannedWithCommands} command tests verified`,
  detail: `${testFiles.length} test files scanned`,
});
