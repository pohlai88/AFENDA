#!/usr/bin/env node
/**
 * tools/gates/vitest-config-convention.mjs
 *
 * CI gate: enforces that Vitest test.include globs target only convention
 * folders with double-underscore names, such as __vitest_test__/.
 *
 * Rules enforced:
 *   1. VITEST_INCLUDE_MISSING — vitest.config.ts must define test.include.
 *   2. VITEST_INCLUDE_NON_CONVENTION — every test.include glob must contain "__".
 *
 * Usage:
 *   node tools/gates/vitest-config-convention.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";

import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const SCAN_ROOTS = ["packages", "apps"];

const RULE_DOCS = {
  VITEST_INCLUDE_MISSING: {
    why: "Without an explicit test.include, Vitest may discover tests outside the repo's convention folders and silently bypass the dedicated test-location rules.",
    docs: "See tools/gates/test-location.mjs and the __vitest_test__/ convention across the repo.",
  },
  VITEST_INCLUDE_NON_CONVENTION: {
    why: "Vitest configs should only point at convention folders so test discovery stays aligned with the CI-enforced __vitest_test__/ structure.",
    docs: "Use include globs like src/**/__vitest_test__/**/*.test.ts and src/**/__vitest_test__/**/*.test.tsx.",
  },
};

function findVitestConfigs(dir) {
  const results = [];
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".turbo") continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findVitestConfigs(fullPath));
      continue;
    }

    if (entry.name === "vitest.config.ts") {
      results.push(fullPath);
    }
  }

  return results;
}

function extractTestIncludePatterns(content) {
  const match = content.match(/test\s*:\s*\{[\s\S]*?include\s*:\s*\[([\s\S]*?)\]/m);
  if (!match) return null;

  const arrayBody = match[1] ?? "";
  const patterns = [];
  const stringPattern = /["'`]([^"'`]+)["'`]/g;
  let stringMatch;

  while ((stringMatch = stringPattern.exec(arrayBody)) !== null) {
    patterns.push(stringMatch[1]);
  }

  return patterns;
}

function suggestMissingFix() {
  return 'Add test.include with convention-folder globs, e.g. ["src/**/__vitest_test__/**/*.test.ts", "src/**/__vitest_test__/**/*.test.tsx"].';
}

function suggestPatternFix(pattern) {
  return `Replace \"${pattern}\" with a convention-folder glob under __vitest_test__/.`;
}

const t0 = performance.now();
const violations = [];
let configCount = 0;

for (const scanRoot of SCAN_ROOTS) {
  const absRoot = resolve(ROOT, scanRoot);
  if (!existsSync(absRoot)) continue;

  const configs = findVitestConfigs(absRoot);
  for (const configPath of configs) {
    configCount += 1;
    const relPath = relative(ROOT, configPath).split(sep).join("/");
    const content = readFileSync(configPath, "utf8");
    const patterns = extractTestIncludePatterns(content);

    if (!patterns || patterns.length === 0) {
      violations.push({
        ruleCode: "VITEST_INCLUDE_MISSING",
        file: relPath,
        line: null,
        statement: null,
        message: "vitest.config.ts is missing test.include globs",
        fix: suggestMissingFix(),
      });
      continue;
    }

    for (const pattern of patterns) {
      if (!pattern.includes("__")) {
        violations.push({
          ruleCode: "VITEST_INCLUDE_NON_CONVENTION",
          file: relPath,
          line: null,
          statement: `include: ${pattern}`,
          message: `test.include glob \"${pattern}\" does not target a convention folder with double underscores`,
          fix: suggestPatternFix(pattern),
        });
      }
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

if (violations.length === 0) {
  reportSuccess({
    gateName: "vitest-config-convention check",
    detail: `${configCount} vitest configs scanned in ${elapsed}s`,
  });
  process.exit(0);
}

reportViolations({
  gateName: "VITEST-CONFIG-CONVENTION CHECK",
  violations,
  ruleDocs: RULE_DOCS,
  stats: {
    "Configs scanned:": configCount,
  },
  elapsed,
});

process.exit(1);
