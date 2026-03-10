#!/usr/bin/env node
/**
 * tools/gates/server-clock.mjs
 *
 * CI gate: bans `new Date()` in files that interact with the database.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. NO_JS_DATE_IN_DB_CODE — files that import from "drizzle-orm" or
 *     "@afenda/db" must not use new Date().  Use sql('now()') from
 *     drizzle-orm instead, so timestamps always come from the DB server
 *     clock (consistent, no timezone drift, transactional).
 *
 * Scans packages/core/src and apps/{api,worker}/src.
 * Test files (__vitest_test__/, __e2e_test__/) are excluded.
 *
 * A line-level opt-out is available by appending: // gate:allow-js-date
 *
 * Usage:
 *   node tools/gates/server-clock.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

/** Directories to scan for DB-touching source files. */
const SCAN_DIRS = ["packages/core/src", "apps/api/src", "apps/worker/src"];

/** Directories whose files are exempt (test harnesses use new Date() freely). */
const EXEMPT_DIR_NAMES = new Set(["__vitest_test__", "__e2e_test__"]);

/** Imports that signal a file interacts with the database. */
const DB_IMPORT_MARKERS = ["drizzle-orm", "@afenda/db"];

/** Line-level opt-out comment. */
const OPT_OUT = "gate:allow-js-date";

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  NO_JS_DATE_IN_DB_CODE: {
    why: "new Date() uses the application server clock, which may differ from the DB server clock. Inside a transaction, sql`now()` is consistent and reflects the transaction start time, preventing subtle timestamp mismatches between columns updated in the same operation.",
    docs: "See packages/db/OWNERS.md — DDL Purity Rules (server-clock rationale)",
  },
};

function suggestFix() {
  return `Replace "new Date()" with "sql\`now()\`" from drizzle-orm. For computed durations, use Date.now() (numeric ms) or add a "// gate:allow-js-date" comment on the same line or the line above, with a justification.`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check whether a file imports any of the DB marker modules.
 */
function importsDb(content) {
  for (const marker of DB_IMPORT_MARKERS) {
    if (content.includes(`"${marker}"`) || content.includes(`'${marker}'`)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if any path component is an exempt directory.
 */
function isExemptPath(relPath) {
  const parts = relPath.split(/[/\\]/);
  return parts.some((p) => EXEMPT_DIR_NAMES.has(p));
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let fileCount = 0;
let dbFileCount = 0;

for (const scanDir of SCAN_DIRS) {
  const absDir = resolve(ROOT, scanDir);
  if (!existsSync(absDir)) continue;

  const files = walkTs(absDir);
  fileCount += files.length;

  for (const file of files) {
    const relFile = relative(ROOT, file).split(sep).join("/");

    // Skip test directories
    if (isExemptPath(relFile)) continue;

    const content = readFileSync(file, "utf-8");

    // Only check files that touch the database
    if (!importsDb(content)) continue;
    dbFileCount++;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comment lines
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

      // Skip lines with the opt-out comment (check current and previous line)
      if (line.includes(OPT_OUT)) continue;
      const prevLine = i > 0 ? lines[i - 1] : "";
      if (prevLine.includes(OPT_OUT)) continue;

      // Detect new Date() — with or without arguments
      if (/\bnew\s+Date\s*\(/.test(line)) {
        violations.push({
          ruleCode: "NO_JS_DATE_IN_DB_CODE",
          file: relFile,
          line: i + 1,
          statement: line.trim(),
          message: `"new Date()" used in a DB-touching file — use sql\`now()\` from drizzle-orm instead`,
          fix: suggestFix(),
        });
      }
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  reportViolations({
    gateName: "SERVER-CLOCK CHECK",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Files scanned:": fileCount,
      "DB-touching files:": dbFileCount,
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "server-clock check",
    detail: `${dbFileCount} DB-touching files checked (${fileCount} total) in ${elapsed}s`,
  });
}
