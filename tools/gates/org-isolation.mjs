#!/usr/bin/env node
/**
 * tools/gates/org-isolation.mjs
 *
 * CI gate: ensures every multi-tenant service has cross-org access prevention tests.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. ORG_ISOLATION_TEST_MISSING — A test file touches multi-tenant tables
 *     (invoice, supplier, journal_entry, etc.) but does not include a test
 *     case that verifies cross-org access is prevented.
 *
 * Usage:
 *   node tools/gates/org-isolation.mjs
 *
 * Philosophy:
 *   Multi-tenant data leaks are catastrophic. Every service test that touches
 *   org-scoped data MUST verify that org isolation works. This gate enforces
 *   that pattern.
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
 * Multi-tenant tables that require org isolation.
 * Any test touching these tables MUST verify cross-org access prevention.
 */
const MULTI_TENANT_TABLES = [
  // ── ERP core entities ─────────────────────────────────────────────────
  "invoice",
  "supplier",
  "journal_entry",
  "evidence",
  // ── Kernel entities ───────────────────────────────────────────────────
  "org_setting",
  "iam_principal",
  "iam_role",
  "iam_role_permission",
  "iam_principal_role",
];

/**
 * Test name patterns that indicate org isolation testing.
 */
const ORG_ISOLATION_TEST_PATTERNS = [
  /cross.?org/i,
  /org.?isolation/i,
  /unauthorized.?org/i,
  /different.?org/i,
  /other.?org/i,
  /rejects?.*(different|other|cross).?org/i,
];

// ─── Rule Documentation ──────────────────────────────────────────────────────

const RULE_DOCS = {
  ORG_ISOLATION_TEST_MISSING: {
    why: "Multi-tenant data leaks are catastrophic security failures. Every test that touches org-scoped tables MUST verify cross-org access is prevented.",
    docs: "See docs/ci-gates-evaluation.md — Section 4.1: Org Isolation",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "ORG_ISOLATION_TEST_MISSING":
      return `Add a cross-org isolation test to ${ctx.file}:

  it("rejects access to different org's data", async () => {
    // 1. Create resource in Org A
    const { id } = await createResource(app, ORG_A_USER);
    
    // 2. Attempt access from Org B
    const res = await injectAs(app, ORG_B_USER, {
      method: "GET",
      url: \`/v1/resource/\${id}\`
    });
    
    // 3. Assert rejection (403 or 404 to prevent enumeration)
    expect(res.statusCode).toBe(403);
  });

See templates/cross-org.test.template.ts for complete example.`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract test case names from a test file.
 */
function extractTestCases(content) {
  const testNames = [];
  // Match: it("test name", ...) or test("test name", ...)
  const regex = /(?:it|test)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    testNames.push(match[1]);
  }
  return testNames;
}

/**
 * Check if test cases include org isolation testing.
 */
function hasOrgIsolationTest(testNames) {
  return testNames.some((name) =>
    ORG_ISOLATION_TEST_PATTERNS.some((pattern) => pattern.test(name))
  );
}

/**
 * Check if file content references multi-tenant tables.
 */
function touchesMultiTenantTables(content) {
  return MULTI_TENANT_TABLES.some((table) => {
    // Check for table references: .from(tableName), .insert(tableName), etc.
    const tableNameRegex = new RegExp(
      `(?:from|insert|update|delete|select)\\s*\\(\\s*${table}[,)]`,
      "i"
    );
    // Also check for string references: "invoice", 'supplier', etc.
    const stringRefRegex = new RegExp(`["'\`]${table}["'\`]`, "i");
    return tableNameRegex.test(content) || stringRefRegex.test(content);
  });
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
let scannedWithMultiTenant = 0;

for (const file of testFiles) {
  const content = readFileSync(file, "utf-8");
  const relPath = relative(ROOT, file);

  // Skip setup files — they touch multi-tenant data for seeding, not for testing access
  if (relPath.includes("setup") || relPath.includes("factories") || relPath.includes("helpers")) {
    continue;
  }

  // Skip if file doesn't touch multi-tenant tables
  if (!touchesMultiTenantTables(content)) {
    continue;
  }

  scannedWithMultiTenant++;

  // Extract test case names
  const testCases = extractTestCases(content);

  // Check if any test case verifies org isolation
  if (!hasOrgIsolationTest(testCases)) {
    violations.push({
      ruleCode: "ORG_ISOLATION_TEST_MISSING",
      file: relPath,
      message: `Test touches multi-tenant tables (${MULTI_TENANT_TABLES.filter((t) =>
        content.includes(t)
      ).join(", ")}) but has no cross-org access test`,
      meta: {
        tablesFound: MULTI_TENANT_TABLES.filter((t) => content.includes(t)),
        testCaseCount: testCases.length,
      },
    });
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

if (violations.length > 0) {
  reportViolations({
    gateName: "ORG ISOLATION",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Test files scanned:": testFiles.length,
      "Multi-tenant tests:": scannedWithMultiTenant,
    },
    elapsed,
  });
  process.exit(1);
}

reportSuccess({
  gateName: `org isolation coverage complete — ${scannedWithMultiTenant} multi-tenant tests verified`,
  detail: `${testFiles.length} test files scanned in ${TEST_DIR.split(/[\\/]/).slice(-3).join("/")}`,
});
