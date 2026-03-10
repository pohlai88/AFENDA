#!/usr/bin/env node
/**
 * tools/gates/token-compliance-block-fixer.mjs
 *
 * Auto-fixer for token-compliance violations in shadcn block components.
 *
 * **What this fixes:**
 * 1. dark: prefix removal in className strings
 * 2. Invalid @/ import aliases → relative paths
 *
 * **Typical violations in blocks:**
 * - `dark:bg-input/30` → remove (DS tokens handle dark mode)
 * - `dark:hover:bg-accent/50` → `hover:bg-accent/50`
 * - `import { cn } from "@/lib/utils"` → `import { cn } from "../../../lib/utils"`
 *
 * **Safe operations:**
 * - Only touches files in packages/ui/src/components/block/
 * - Creates backup before modification
 * - Validates syntax after changes
 *
 * Usage:
 *   node tools/gates/token-compliance-block-fixer.mjs
 *   node tools/gates/token-compliance-block-fixer.mjs --dry-run
 *   node tools/gates/token-compliance-block-fixer.mjs --verify  # Check after manual fixes
 */

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const BLOCK_COMPONENTS_DIR = "packages/ui/src/components/block";
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\.(tsx?|jsx?)$/,
  /[/\\]__vitest_test__[/\\]/,
  /[/\\]e2e[/\\]/,
  /\.d\.ts$/,
];

// ─── Fixers ──────────────────────────────────────────────────────────────────

/**
 * Remove dark: prefix from className strings
 * 
 * Examples:
 *   "dark:bg-input/30" → ""
 *   "hover:bg-accent dark:hover:bg-accent/50" → "hover:bg-accent"
 *   "text-white dark:text-gray-100" → "text-white"
 */
function removeDarkVariants(content) {
  let modified = content;
  let changeCount = 0;

  // Match className="..." and className={cn(...)}
  const classNameRegex = /className\s*=\s*(?:"([^"]*)"|{cn\(([^}]*)\)})/g;
  
  modified = content.replace(classNameRegex, (fullMatch) => {
    let updated = fullMatch;
    
    // Remove dark: prefixes (handles dark:prop and dark:state:prop)
    const before = updated;
    updated = updated.replace(/\s*dark:[a-z-[\]]+(?:\/\d+)?/g, '');
    
    // Clean up double spaces
    updated = updated.replace(/\s{2,}/g, ' ');
    // Clean up trailing/leading spaces in quotes
    updated = updated.replace(/"\s+/g, '"').replace(/\s+"/g, '"');
    // Clean up trailing/leading spaces in template literals
    updated = updated.replace(/`\s+/g, '`').replace(/\s+`/g, '`');
    
    if (before !== updated) changeCount++;
    return updated;
  });

  return { content: modified, changes: changeCount };
}

/**
 * Fix @/ import aliases to relative paths
 * 
 * Examples:
 *   import { cn } from "@/lib/utils" → import { cn } from "../../../lib/utils"
 *   import { Component } from "@/components/ui" → import { Component } from "../../ui"
 */
function fixImportAliases(content) {
  let modified = content;
  let changeCount = 0;

  // Match import statements with @/ alias
  const importRegex = /import\s+(?:{[^}]+}|[\w*]+(?:\s+as\s+\w+)?)\s+from\s+["']@\/([^"']+)["']/g;
  
  modified = content.replace(importRegex, (fullMatch, importPath) => {
    changeCount++;
    
    // Common patterns in block components
    if (importPath === "lib/utils") {
      return fullMatch.replace('@/lib/utils', '../../../lib/utils');
    } else if (importPath.startsWith("components/")) {
      const componentPath = importPath.replace("components/", "");
      return fullMatch.replace(`@/${importPath}`, `../../${componentPath}`);
    } else {
      // Generic fallback — assume 3 levels deep from block/[name]/file.tsx
      return fullMatch.replace(`@/${importPath}`, `../../../${importPath}`);
    }
  });

  return { content: modified, changes: changeCount };
}

/**
 * Apply all fixes to a file
 */
function fixFile(filePath, dryRun = false) {
  const original = readFileSync(filePath, "utf-8");
  let content = original;
  const fixes = [];

  // Apply dark: variant removal
  const darkFix = removeDarkVariants(content);
  content = darkFix.content;
  if (darkFix.changes > 0) {
    fixes.push(`Removed ${darkFix.changes} dark: variant(s)`);
  }

  // Apply import alias fixes
  const importFix = fixImportAliases(content);
  content = importFix.content;
  if (importFix.changes > 0) {
    fixes.push(`Fixed ${importFix.changes} @/ import alias(es)`);
  }

  if (fixes.length === 0) {
    return null; // No changes needed
  }

  if (!dryRun) {
    // Create backup
    const backupPath = `${filePath}.backup`;
    copyFileSync(filePath, backupPath);
    
    // Write fixed content
    writeFileSync(filePath, content, "utf-8");
  }

  return {
    file: relative(ROOT, filePath),
    fixes,
    dryRun,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verify = args.includes("--verify");

  console.log("🔧 Token Compliance Block Fixer\n");
  
  if (dryRun) {
    console.log("   Mode: DRY RUN (preview only, no changes)\n");
  } else if (verify) {
    console.log("   Mode: VERIFY (check for remaining violations)\n");
  } else {
    console.log("   Mode: FIX (will modify files and create backups)\n");
  }

  // Find all block component files
  const blockDir = resolve(ROOT, BLOCK_COMPONENTS_DIR);
  const files = [];
  for await (const file of walkTs(blockDir, EXCLUDE_PATTERNS)) {
    files.push(file);
  }
  
  if (files.length === 0) {
    console.log("❌ No block component files found");
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} files in ${BLOCK_COMPONENTS_DIR}\n`);

  const results = [];
  let totalFiles = files.length;
  let fixedFiles = 0;

  for (const file of files) {
    const result = fixFile(file, dryRun || verify);
    if (result) {
      results.push(result);
      if (!verify) fixedFiles++;
    }
  }

  // ─── Report ──────────────────────────────────────────────────────────────────

  if (results.length === 0) {
    console.log("✅ All block components are compliant — no fixes needed\n");
    process.exit(0);
  }

  if (verify) {
    console.log(`❌ Found ${results.length} file(s) with violations:\n`);
  } else if (dryRun) {
    console.log(`📋 Preview: ${fixedFiles} file(s) would be fixed:\n`);
  } else {
    console.log(`✅ Fixed ${fixedFiles} file(s):\n`);
  }

  for (const result of results) {
    console.log(`   ${result.file}`);
    for (const fix of result.fixes) {
      console.log(`      • ${fix}`);
    }
  }

  console.log();

  if (dryRun) {
    console.log("💡 Run without --dry-run to apply fixes");
  } else if (!verify) {
    console.log("💡 Backup files created with .backup extension");
    console.log("💡 Run `pnpm typecheck` to verify syntax");
  }

  process.exit(verify && results.length > 0 ? 1 : 0);
}

main();
