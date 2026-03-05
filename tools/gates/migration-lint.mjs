#!/usr/bin/env node
/**
 * tools/gates/migration-lint.mjs
 *
 * CI gate: lints SQL migration files for dangerous patterns.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. MIGRATION_DESTRUCTIVE_NO_GUARD — DROP TABLE/COLUMN without a preceding
 *     "-- DESTRUCTIVE:" comment explaining why.
 *  2. MIGRATION_ADD_NOT_NULL_NO_DEFAULT — ADD COLUMN ... NOT NULL without
 *     a DEFAULT clause. Will fail on non-empty tables.
 *  3. MIGRATION_ENUM_CHANGE — ALTER TYPE ... ADD VALUE or RENAME VALUE.
 *     Enum changes can't be rolled back inside a transaction.
 *  4. MIGRATION_MISSING_ANALYZE — Data migrations with UPDATE...SET or
 *     INSERT...SELECT that don't end with ANALYZE.
 *
 * Scans all .sql files in packages/db/drizzle/ (skipping meta/ subdirectory).
 *
 * Usage:
 *   node tools/gates/migration-lint.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const MIGRATIONS_DIR = resolve(ROOT, "packages/db/drizzle");

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  MIGRATION_DESTRUCTIVE_NO_GUARD: {
    why: "Destructive DDL (DROP TABLE, DROP COLUMN) can cause irreversible data loss. A comment documents that the destruction is intentional.",
    docs: "See docs/adr/upgrade.md — Step 5: MIGRATION_DESTRUCTIVE_NO_GUARD",
  },
  MIGRATION_ADD_NOT_NULL_NO_DEFAULT: {
    why: "Adding a NOT NULL column without a DEFAULT will fail on non-empty tables. Always provide a DEFAULT or backfill in the same migration.",
    docs: "See docs/adr/upgrade.md — Step 5: MIGRATION_ADD_NOT_NULL_NO_DEFAULT",
  },
  MIGRATION_ENUM_CHANGE: {
    why: "ALTER TYPE ... ADD VALUE / RENAME VALUE cannot be rolled back inside a transaction. Flag for manual review.",
    docs: "See docs/adr/upgrade.md — Step 5: MIGRATION_ENUM_CHANGE",
  },
  MIGRATION_MISSING_ANALYZE: {
    why: "Bulk data changes (UPDATE...SET, INSERT...SELECT) leave stale statistics. An ANALYZE at the end ensures the query planner has fresh data.",
    docs: "See docs/adr/upgrade.md — Step 5: MIGRATION_MISSING_ANALYZE",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "MIGRATION_DESTRUCTIVE_NO_GUARD":
      return `Add a comment above the destructive statement: -- DESTRUCTIVE: <reason why this is safe>`;
    case "MIGRATION_ADD_NOT_NULL_NO_DEFAULT":
      return `Add DEFAULT <value> to the column definition, or split into: ADD COLUMN (nullable) → UPDATE → ALTER SET NOT NULL.`;
    case "MIGRATION_ENUM_CHANGE":
      return `Ensure this migration runs outside a transaction (drizzle breakpoints), and document rollback procedure in a comment.`;
    case "MIGRATION_MISSING_ANALYZE":
      return `Add ANALYZE ${ctx.tables || "<affected_tables>"} at the end of the migration file.`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively collect .sql files from a directory, skipping meta/.
 */
function collectSqlFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name === "meta") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSqlFiles(full));
    } else if (entry.name.endsWith(".sql")) {
      files.push(full);
    }
  }
  return files;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let fileCount = 0;

const sqlFiles = collectSqlFiles(MIGRATIONS_DIR);
fileCount = sqlFiles.length;

for (const filePath of sqlFiles) {
  const content = readFileSync(filePath, "utf-8");
  const relFile = relative(ROOT, filePath).split(sep).join("/");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim().toUpperCase();

    // Skip comment-only lines
    if (trimmed.startsWith("--")) continue;

    // ── Rule 1: MIGRATION_DESTRUCTIVE_NO_GUARD ─────────────────────────
    const isDestructive =
      /\bDROP\s+TABLE\b/i.test(line) ||
      /\bDROP\s+COLUMN\b/i.test(line) ||
      /\bALTER\s+TABLE\s+\S+\s+DROP\b/i.test(line);

    if (isDestructive) {
      // Check if there's a "-- DESTRUCTIVE:" comment on a preceding line
      const hasGuard = (() => {
        for (let j = Math.max(0, i - 5); j < i; j++) {
          if (/--\s*DESTRUCTIVE:/i.test(lines[j])) return true;
        }
        return false;
      })();

      if (!hasGuard) {
        violations.push({
          ruleCode: "MIGRATION_DESTRUCTIVE_NO_GUARD",
          file: relFile,
          line: lineNum,
          message: `Destructive statement without a "-- DESTRUCTIVE:" guard comment`,
          fix: suggestFix("MIGRATION_DESTRUCTIVE_NO_GUARD"),
        });
      }
    }

    // ── Rule 2: MIGRATION_ADD_NOT_NULL_NO_DEFAULT ──────────────────────
    if (/\bADD\s+COLUMN\b/i.test(line)) {
      // Collect the full statement (may span lines ending with ;)
      let stmt = line;
      let k = i + 1;
      while (!stmt.includes(";") && k < lines.length) {
        stmt += " " + lines[k];
        k++;
      }
      const upper = stmt.toUpperCase();
      if (upper.includes("NOT NULL") && !upper.includes("DEFAULT")) {
        violations.push({
          ruleCode: "MIGRATION_ADD_NOT_NULL_NO_DEFAULT",
          file: relFile,
          line: lineNum,
          message: `ADD COLUMN with NOT NULL but no DEFAULT — will fail on non-empty tables`,
          fix: suggestFix("MIGRATION_ADD_NOT_NULL_NO_DEFAULT"),
        });
      }
    }

    // ── Rule 3: MIGRATION_ENUM_CHANGE ──────────────────────────────────
    if (/\bALTER\s+TYPE\b/i.test(line) && /\bADD\s+VALUE\b|\bRENAME\s+VALUE\b/i.test(line)) {
      violations.push({
        ruleCode: "MIGRATION_ENUM_CHANGE",
        file: relFile,
        line: lineNum,
        message: `Enum modification detected — cannot be rolled back inside a transaction`,
        fix: suggestFix("MIGRATION_ENUM_CHANGE"),
      });
    }
  }

  // ── Rule 4: MIGRATION_MISSING_ANALYZE ────────────────────────────────
  const upper = content.toUpperCase();
  const hasDataChange =
    /\bUPDATE\b[^;]*\bSET\b/i.test(content) ||
    /\bINSERT\b[^;]*\bSELECT\b/i.test(content);
  const hasAnalyze = /\bANALYZE\b/i.test(content);

  if (hasDataChange && !hasAnalyze) {
    violations.push({
      ruleCode: "MIGRATION_MISSING_ANALYZE",
      file: relFile,
      line: null,
      message: `Migration contains data changes (UPDATE...SET or INSERT...SELECT) but no ANALYZE statement`,
      fix: suggestFix("MIGRATION_MISSING_ANALYZE"),
    });
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  reportViolations({
    gateName: "migration-lint check",
    violations,
    ruleDocs: RULE_DOCS,
    stats: { "SQL files:": fileCount },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "migration-lint check",
    detail: `${fileCount} SQL file${fileCount !== 1 ? "s" : ""} scanned in ${elapsed}s`,
  });
}
