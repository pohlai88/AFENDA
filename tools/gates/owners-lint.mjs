#!/usr/bin/env node
/**
 * tools/gates/owners-lint.mjs
 *
 * CI gate: validates that OWNERS.md "Files" tables stay in sync with the
 * actual TypeScript files on disk.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. OWNERS_PHANTOM_FILE — an OWNERS.md "Files" table lists a .ts file
 *     that does not exist on disk. The table is stale.
 *  2. OWNERS_UNLISTED_FILE — a .ts file exists in the directory but is not
 *     listed in the OWNERS.md "Files" table.
 *
 * Scans all OWNERS.md files that contain a markdown table whose first column
 * header is "File" (case-insensitive). Typically found in
 * packages/contracts/src/<domain>/OWNERS.md.
 *
 * Usage:
 *   node tools/gates/owners-lint.mjs
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

/**
 * Directories to scan for OWNERS.md files.
 * We scan recursively for any OWNERS.md that contains a Files table.
 */
const SCAN_ROOTS = [
  "packages/contracts/src",
  "packages/core/src",
  "packages/db/src",
];

/**
 * Files that are exempt from the "unlisted" check.
 * OWNERS.md itself is not a .ts file so it's naturally exempt.
 */
const UNLISTED_EXEMPT = new Set([
  // No exemptions currently — all .ts files should be documented
]);

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  OWNERS_PHANTOM_FILE: {
    why: "OWNERS.md lists a file that doesn't exist on disk. The table is stale and misleads reviewers about what the directory contains.",
    docs: "See tools/OWNERS.md — Adding a new gate",
  },
  OWNERS_UNLISTED_FILE: {
    why: "A .ts file exists in the directory but isn't documented in OWNERS.md. New files should be added to the Files table so owners/reviewers can track domain coverage.",
    docs: "See packages/contracts/OWNERS.md §6 — Subdirectory Layout",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "OWNERS_PHANTOM_FILE":
      return `Remove "${ctx.file}" from the Files table in ${ctx.ownersFile}, or create the file if it was intended.`;
    case "OWNERS_UNLISTED_FILE":
      return `Add "${ctx.file}" to the Files table in ${ctx.ownersFile} with its key exports and purpose.`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Parsing Helpers ─────────────────────────────────────────────────────────

/**
 * Find all OWNERS.md files recursively under a directory.
 *
 * @param {string} dir  — absolute path
 * @returns {string[]}  — absolute paths to OWNERS.md files
 */
function findOwnersMdFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".turbo") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findOwnersMdFiles(full));
    } else if (entry.name === "OWNERS.md") {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract filenames from a markdown "Files" table in OWNERS.md content.
 *
 * Looks for a table whose first column header contains "File" (case-insensitive).
 * Extracts backtick-wrapped filenames from the first column of each data row.
 *
 * @param {string} content — OWNERS.md file content
 * @returns {string[] | null} — filenames, or null if no Files table found
 */
function extractFilesTable(content) {
  const lines = content.split("\n");
  let inTable = false;
  let pastSeparator = false;
  const files = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inTable) {
      // Look for a header row containing "| File" (case-insensitive)
      if (/^\|\s*File\s*\|/i.test(trimmed)) {
        inTable = true;
        continue;
      }
    } else if (!pastSeparator) {
      // Skip the separator line: |---|---|
      if (/^\|[\s\-:|]+\|/.test(trimmed)) {
        pastSeparator = true;
        continue;
      }
      // Not a valid table — reset
      inTable = false;
    } else {
      // Data rows
      if (!trimmed.startsWith("|")) {
        // End of table — reset for next potential table
        inTable = false;
        pastSeparator = false;
        continue;
      }
      // Extract filename from first column: | `filename.ts` | ... |
      const m = trimmed.match(/^\|\s*`([^`]+)`/);
      if (m) files.push(m[1]);
    }
  }

  return files.length > 0 ? files : null;
}

/**
 * List .ts files in a directory (non-recursive, immediate children only).
 *
 * @param {string} dir — absolute path
 * @returns {string[]} — filenames (not full paths)
 */
function listTsFiles(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.isDirectory() && /\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts"))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let ownersCount = 0;
let filesChecked = 0;

for (const scanRoot of SCAN_ROOTS) {
  const absRoot = resolve(ROOT, scanRoot);
  if (!existsSync(absRoot)) continue;

  const ownersMdFiles = findOwnersMdFiles(absRoot);

  for (const ownersPath of ownersMdFiles) {
    const content = readFileSync(ownersPath, "utf-8");
    const listedFiles = extractFilesTable(content);

    // Skip OWNERS.md files without a Files table
    if (!listedFiles) continue;

    ownersCount++;
    const ownersDir = dirname(ownersPath);
    const relOwners = relative(ROOT, ownersPath).split(sep).join("/");

    // Get actual .ts files on disk in the same directory
    const actualFiles = listTsFiles(ownersDir);
    const actualSet = new Set(actualFiles);
    const listedSet = new Set(listedFiles);

    filesChecked += listedFiles.length + actualFiles.length;

    // ── Rule 1: OWNERS_PHANTOM_FILE — listed but doesn't exist ─────────
    for (const file of listedFiles) {
      // Only check .ts/.tsx files — skip notes like "(deprecated)"
      if (!/\.tsx?$/.test(file)) continue;

      // Files may include subdirectory paths (e.g. "__vitest_test__/foo.test.ts")
      // Resolve relative to the OWNERS.md directory
      const absFile = resolve(ownersDir, file);
      if (!existsSync(absFile)) {
        violations.push({
          ruleCode: "OWNERS_PHANTOM_FILE",
          file: relOwners,
          line: null,
          message: `"${file}" is listed in the Files table but does not exist on disk`,
          fix: suggestFix("OWNERS_PHANTOM_FILE", { file, ownersFile: relOwners }),
        });
      }
    }

    // ── Rule 2: OWNERS_UNLISTED_FILE — exists but not listed ───────────
    for (const file of actualFiles) {
      if (UNLISTED_EXEMPT.has(file)) continue;
      if (listedSet.has(file)) continue;

      violations.push({
        ruleCode: "OWNERS_UNLISTED_FILE",
        file: relOwners,
        line: null,
        message: `"${file}" exists in ${relative(ROOT, ownersDir).split(sep).join("/")}/ but is not listed in the Files table`,
        fix: suggestFix("OWNERS_UNLISTED_FILE", { file, ownersFile: relOwners }),
      });
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  reportViolations({
    gateName: "OWNERS.md LINT",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "OWNERS.md files:": ownersCount,
      "Files checked:": filesChecked,
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "owners-lint check",
    detail: `${ownersCount} OWNERS.md file${ownersCount !== 1 ? "s" : ""} verified in ${elapsed}s`,
  });
}
