#!/usr/bin/env node
/**
 * tools/gates/test-location.mjs
 *
 * CI gate: enforces that test files live in dedicated convention folders.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. *.test.ts / *.test.tsx files MUST reside inside a __vitest_test__/ dir.
 *  2. *.e2e.ts / *.e2e.tsx / *.e2e-test.ts files MUST reside inside a __e2e_test__/ dir.
 *  3. No test files of any kind may appear at the package root src/ level
 *     outside these convention folders.
 *
 * This prevents test files from leaking into tsc build output and ensures
 * a consistent, discoverable test file structure across the monorepo.
 *
 * Usage:
 *   node tools/gates/test-location.mjs
 */

import { existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

/** Directories to scan for misplaced test files. */
const SCAN_DIRS = [
  "packages/contracts",
  "packages/core",
  "packages/db",
  "packages/ui",
  "apps/api",
  "apps/web",
  "apps/worker",
];

/** The required parent folder for each test file pattern. */
const TEST_PATTERNS = [
  {
    /** Vitest unit/integration tests */
    match: /\.test\.tsx?$/,
    requiredDir: "__vitest_test__",
    label: "Vitest test",
  },
  {
    /** E2E tests */
    match: /\.e2e(?:-test)?\.tsx?$/,
    requiredDir: "__e2e_test__",
    label: "E2E test",
  },
];

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  MISPLACED_TEST: {
    why: "Test files outside convention folders leak into tsc build output (dist/) and break module boundaries.",
    docs: "See packages/core/OWNERS.md — Test File Convention",
  },
};

/** Generate a human-readable fix suggestion for a violation. */
function suggestFix({ relFile, requiredDir }) {
  // Extract the directory part and suggest the correct location
  const parts = relFile.split("/");
  const fileName = parts.pop();
  const currentDir = parts.join("/");
  return `Move to ${currentDir}/${requiredDir}/${fileName} and update relative imports (add ../ prefix).`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let totalFiles = 0;

for (const scanDir of SCAN_DIRS) {
  const absDir = resolve(ROOT, scanDir);
  if (!existsSync(absDir)) continue;

  const files = walkTs(absDir);
  totalFiles += files.length;

  for (const file of files) {
    const relFile = relative(ROOT, file).split(sep).join("/");

    for (const pattern of TEST_PATTERNS) {
      const fileName = relFile.split("/").pop();
      if (!pattern.match.test(fileName)) continue;

      // Check if the file is inside the required convention folder
      const normalised = relFile.split("/");
      const isInRequiredDir = normalised.some((segment) => segment === pattern.requiredDir);

      if (!isInRequiredDir) {
        violations.push({
          ruleCode: "MISPLACED_TEST",
          file: relFile,
          line: null,
          statement: null,
          message: `${pattern.label} file "${fileName}" is not inside a ${pattern.requiredDir}/ folder`,
          fix: suggestFix({ relFile, requiredDir: pattern.requiredDir }),
        });
      }
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  reportSuccess({
    gateName: "test-location check",
    detail: `${totalFiles} files scanned in ${elapsed}s`,
  });
  process.exit(0);
}

reportViolations({
  gateName: "TEST-LOCATION CHECK",
  violations,
  ruleDocs: RULE_DOCS,
  stats: {
    "Files scanned:": totalFiles,
  },
  elapsed,
});

process.exit(1);
