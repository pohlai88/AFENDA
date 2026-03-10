#!/usr/bin/env node
/**
 * tools/gates/import-alias-validation.mjs
 *
 * CI gate: detects invalid path aliases in package code that would fail at runtime.
 *
 * **Problem this solves:**
 * shadcn blocks use `@/lib/utils` import alias which works in Next.js apps but
 * breaks in library packages (packages/ui, packages/core, etc.) that don't have
 * tsconfig paths configured.
 *
 * **Common violations:**
 * - `import { cn } from "@/lib/utils"` in packages/ui/src/components/block/*
 * - `import { something } from "@/components/*"` in packages/*
 *
 * **Fix:**
 * - In packages/ui block components: use relative paths `../../../lib/utils`
 * - In apps/web: `@/` alias is valid (configured in tsconfig.json)
 *
 * Usage:
 *   node tools/gates/import-alias-validation.mjs
 *   node tools/gates/import-alias-validation.mjs --fix  # Auto-fix block components
 *
 * Exit code 0 = clean, 1 = violations found.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const GATE_NAME = "IMPORT ALIAS VALIDATION";

// ─── Scan targets ────────────────────────────────────────────────────────────

/** Package directories where @/ alias is INVALID */
const PACKAGE_DIRS = [
  resolve(ROOT, "packages/ui/src"),
  resolve(ROOT, "packages/core/src"),
  resolve(ROOT, "packages/db/src"),
  resolve(ROOT, "packages/contracts/src"),
];

/** App directories where @/ alias is VALID (has tsconfig paths) */
const APP_DIRS = [
  "apps/web/src",
  "apps/api/src",
  "apps/worker/src",
];

/** Skip these paths entirely */
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\.(tsx?|jsx?)$/,
  /[/\\]__vitest_test__[/\\]/,
  /[/\\]e2e[/\\]/,
  /\.d\.ts$/,
];

// ─── Rule Documentation ──────────────────────────────────────────────────────

const RULE_DOCS = {
  INVALID_ALIAS: {
    why: "Package code cannot use @/ import alias — it only works in Next.js apps with tsconfig paths",
    docs: "Use relative imports in packages/ui, packages/core, packages/db, packages/contracts",
    commonFix: "Change '@/lib/utils' to '../../../lib/utils' in block components",
    autoFix: "Run with --fix flag to automatically correct block component cn imports",
  },
};

// ─── Detection ───────────────────────────────────────────────────────────────

/**
 * Detect `@/` alias imports in package code
 * @param {string} filePath - Absolute path to file
 * @param {boolean} autoFix - Apply auto-fix for block components
 * @returns {{ line: number, col: number, code: string, suggestion: string }[]}
 */
function detectAliasViolations(filePath, autoFix = false) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations = [];
  let modified = false;
  let fixedContent = content;

  const relPath = relative(ROOT, filePath);

  // Check if this is a block component (special auto-fix logic)
  const isBlockComponent = /packages[/\\]ui[/\\]src[/\\]components[/\\]block[/\\]/.test(relPath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match: import { ... } from "@/..."
    const match = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+["']@\/([^"']+)["']/.exec(line);
    if (!match) continue;

    const importPath = match[1]; // e.g., "lib/utils" or "components/button"
    const fullMatch = match[0];
    const col = line.indexOf(match[0]) + 1;

    // Determine relative path replacement
    let suggestion = "";
    if (isBlockComponent && importPath === "lib/utils") {
      suggestion = `import { cn } from "../../../lib/utils"`;
      
      if (autoFix) {
        fixedContent = fixedContent.replace(
          /import\s+{\s*cn\s*}\s+from\s+["']@\/lib\/utils["']/g,
          'import { cn } from "../../../lib/utils"'
        );
        modified = true;
      }
    } else if (isBlockComponent && importPath.startsWith("components/")) {
      const componentName = importPath.replace("components/", "");
      suggestion = `import from "../${componentName}" or "../../${componentName}" (verify depth)`;
    } else {
      suggestion = `Use relative import: import from "../path/to/${importPath}"`;
    }

    violations.push({
      line: lineNum,
      col,
      code: line.trim(),
      importPath,
      suggestion,
    });
  }

  // Write fixed content if auto-fix enabled
  if (autoFix && modified) {
    writeFileSync(filePath, fixedContent, "utf-8");
  }

  return violations;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const autoFix = args.includes("--fix");

  if (autoFix) {
    console.log("🔧 Auto-fix mode enabled\n");
  }

  const startTime = performance.now();
  const allViolations = new Map();
  let totalFiles = 0;
  let fixedFiles = 0;

  // Scan package directories only (apps are allowed to use @/)
  for (const dir of PACKAGE_DIRS) {
    for await (const file of walkTs(dir, EXCLUDE_PATTERNS)) {
      totalFiles++;
      const violations = detectAliasViolations(file, autoFix);
      
      if (violations.length > 0) {
        allViolations.set(file, violations);
        if (autoFix) fixedFiles++;
      }
    }
  }

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

  // ─── Report ──────────────────────────────────────────────────────────────────

  if (allViolations.size === 0) {
    reportSuccess(GATE_NAME, `${totalFiles} package files scanned in ${elapsed}s — no invalid @/ aliases found.`);
    return process.exit(0);
  }

  if (autoFix) {
    console.log(`✅ Fixed ${fixedFiles} file(s) with automatic corrections\n`);
  }

  // Build structured violations
  const violations = [];
  for (const [filePath, fileViolations] of allViolations) {
    const relPath = relative(ROOT, filePath).replace(/\\/g, "/");
    
    for (const v of fileViolations) {
      violations.push({
        ruleCode: "INVALID_ALIAS",
        file: relPath,
        line: v.line,
        col: v.col,
        snippet: v.code,
        message: `Invalid @/ alias: @/${v.importPath}`,
        fix: v.suggestion,
      });
    }
  }

  const summary = {
    gateName: GATE_NAME,
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Files scanned": totalFiles,
      "Elapsed": `${elapsed}s`,
    },
  };

  reportViolations(summary);
  process.exit(1);
}

main();
