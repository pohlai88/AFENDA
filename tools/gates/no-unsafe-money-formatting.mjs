#!/usr/bin/env node
/**
 * tools/gates/no-unsafe-money-formatting.mjs
 *
 * CI gate: bans unsafe money formatting patterns that risk precision loss.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  Money display may only use:
 *    - approved formatter helpers (packages/ui/src/money.ts)
 *    - approved exponent source (packages/core, packages/ui money modules)
 *    - bigint/string-safe conversion path
 *
 *  Banned patterns:
 *    1. Number(x.amountMinor) or Number(money.amountMinor) — float conversion
 *    2. parseFloat/parseInt on money/amountMinor values in formatting paths
 *    3. Intl.NumberFormat().format() with amountMinor-derived value (unsafe)
 *    4. MINOR_EXPONENTS defined outside approved files (drift risk)
 *
 *  Approved files (allow-list):
 *    - packages/ui/src/money.ts — locale-aware display formatter
 *    - packages/core/src/erp/finance/money/money.ts — domain exponent truth
 *
 * Usage:
 *   node tools/gates/no-unsafe-money-formatting.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

/** Directories to scan for source files that might format money. */
const SCAN_DIRS = [
  "packages/ui/src",
  "packages/core/src",
  "packages/contracts/src",
  "apps/api/src",
  "apps/web/src",
  "apps/worker/src",
];

/** Files allowed to contain money-formatting logic and MINOR_EXPONENTS. */
const ALLOWED_FILES = new Set([
  "packages/ui/src/money.ts",
  "packages/core/src/erp/finance/money/money.ts",
]);

/** Directories to skip (tests may use fixtures; gate focuses on production paths). */
const SKIP_DIR_NAMES = new Set(["__vitest_test__", "__e2e_test__"]);

// ─── Rule Documentation ──────────────────────────────────────────────────────

const RULE_DOCS = {
  UNSAFE_NUMBER_AMOUNT_MINOR: {
    why: "Number(amountMinor) loses precision for large values. Use BigInt + approved formatter.",
    docs: "See packages/ui/src/money.ts — formatMoney uses bigint-only conversion.",
  },
  UNSAFE_PARSE_FLOAT_AMOUNT_MINOR: {
    why: "parseFloat on money values causes precision loss. Use bigint/string-safe path.",
    docs: "See packages/core/src/erp/finance/money/money.ts — domain conversion.",
  },
  UNSAFE_PARSE_INT_AMOUNT_MINOR: {
    why: "parseInt on money values in formatting paths is unsafe. Use bigint.",
    docs: "See packages/ui/src/money.ts — formatMoney.",
  },
  UNSAFE_INTL_AMOUNT_MINOR: {
    why: "Passing amountMinor directly to Intl.NumberFormat risks float conversion. Use formatMoney.",
    docs: "See packages/ui/src/money.ts — formatMoney handles safe conversion.",
  },
  UNAPPROVED_MINOR_EXPONENTS: {
    why: "MINOR_EXPONENTS must live in one place to avoid drift. Use approved sources.",
    docs: "See packages/core/src/erp/finance/money/money.ts — domain truth.",
  },
};

function suggestFix(ruleCode) {
  const fixes = {
    UNSAFE_NUMBER_AMOUNT_MINOR: "Use formatMoney from @afenda/ui, or BigInt + toMajorParts.",
    UNSAFE_PARSE_FLOAT_AMOUNT_MINOR: "Use BigInt(m.amountMinor) and formatMoney.",
    UNSAFE_PARSE_INT_AMOUNT_MINOR: "Use BigInt(m.amountMinor) and formatMoney.",
    UNSAFE_INTL_AMOUNT_MINOR: "Use formatMoney from @afenda/ui, which handles safe conversion.",
    UNAPPROVED_MINOR_EXPONENTS: "Import minorExponent from @afenda/core or use formatMoney.",
  };
  return fixes[ruleCode] ?? "Use approved money formatting helpers.";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAllowed(relPath) {
  const normalized = relPath.split(sep).join("/");
  return ALLOWED_FILES.has(normalized);
}

function isSkippedPath(relPath) {
  const parts = relPath.split(/[/\\]/);
  return parts.some((p) => SKIP_DIR_NAMES.has(p));
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let fileCount = 0;

for (const scanDir of SCAN_DIRS) {
  const absDir = resolve(ROOT, scanDir);
  if (!existsSync(absDir)) continue;

  const files = walkTs(absDir);
  fileCount += files.length;

  for (const file of files) {
    const relFile = relative(ROOT, file).split(sep).join("/");

    if (isSkippedPath(relFile)) continue;

    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const allowed = isAllowed(relFile);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comment-only lines
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

      // 1. Number(.*amountMinor.*) — banned unless in allowed file
      if (!allowed && /Number\s*\(\s*[^)]*amountMinor[^)]*\)/.test(line)) {
        violations.push({
          ruleCode: "UNSAFE_NUMBER_AMOUNT_MINOR",
          file: relFile,
          line: i + 1,
          statement: trimmed,
          message: "Number(x.amountMinor) causes precision loss — use bigint + formatMoney",
          fix: suggestFix("UNSAFE_NUMBER_AMOUNT_MINOR"),
        });
      }

      // 2. parseFloat(.*amountMinor.*)
      if (/parseFloat\s*\(\s*[^)]*amountMinor[^)]*\)/.test(line)) {
        violations.push({
          ruleCode: "UNSAFE_PARSE_FLOAT_AMOUNT_MINOR",
          file: relFile,
          line: i + 1,
          statement: trimmed,
          message: "parseFloat on amountMinor causes precision loss",
          fix: suggestFix("UNSAFE_PARSE_FLOAT_AMOUNT_MINOR"),
        });
      }

      // 3. parseInt(.*amountMinor.*)
      if (/parseInt\s*\(\s*[^)]*amountMinor[^)]*\)/.test(line)) {
        violations.push({
          ruleCode: "UNSAFE_PARSE_INT_AMOUNT_MINOR",
          file: relFile,
          line: i + 1,
          statement: trimmed,
          message: "parseInt on amountMinor in formatting path is unsafe",
          fix: suggestFix("UNSAFE_PARSE_INT_AMOUNT_MINOR"),
        });
      }

      // 4. Intl.NumberFormat ... .format(.*amountMinor — direct amountMinor into format
      if (/.format\s*\(\s*[^)]*amountMinor/.test(line)) {
        violations.push({
          ruleCode: "UNSAFE_INTL_AMOUNT_MINOR",
          file: relFile,
          line: i + 1,
          statement: trimmed,
          message: "amountMinor passed to Intl.NumberFormat.format — use formatMoney",
          fix: suggestFix("UNSAFE_INTL_AMOUNT_MINOR"),
        });
      }

      // 5. MINOR_EXPONENTS defined outside approved files
      if (!allowed && /const\s+MINOR_EXPONENTS\s*=/.test(line)) {
        violations.push({
          ruleCode: "UNAPPROVED_MINOR_EXPONENTS",
          file: relFile,
          line: i + 1,
          statement: trimmed,
          message: "MINOR_EXPONENTS must only be defined in approved sources",
          fix: suggestFix("UNAPPROVED_MINOR_EXPONENTS"),
        });
      }
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ───────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  reportViolations({
    gateName: "NO-UNSAFE-MONEY-FORMATTING",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Files scanned:": fileCount,
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "no-unsafe-money-formatting",
    detail: `${fileCount} files checked in ${elapsed}s`,
  });
}
