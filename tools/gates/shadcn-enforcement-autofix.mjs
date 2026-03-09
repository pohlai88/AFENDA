#!/usr/bin/env node
/**
 * tools/gates/shadcn-enforcement-autofix.mjs
 *
 * Auto-fix utility for shadcn-enforcement violations.
 * Automatically fixes simple violations where safe to do so.
 *
 * Usage:
 *   node tools/gates/shadcn-enforcement-autofix.mjs [--dry-run]
 *
 * Flags:
 *   --dry-run    Show what would be fixed without making changes
 *   --safe-only  Only apply safe transformations (default: true)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";

// --- Config -----------------------------------------------------------------

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const isDryRun = process.argv.includes("--dry-run");
const safeOnly = !process.argv.includes("--unsafe");

// --- Auto-fix Functions -----------------------------------------------------

/**
 * Auto-fix RAW_INPUT: Replace <input> with <Input>
 */
function fixRawInput(content, imports) {
  let fixed = content;
  let changed = false;
  
  // Replace <input with <Input (preserving attributes)
  const inputPattern = /<input(\s+[^>]*)?>/g;
  if (inputPattern.test(fixed)) {
    fixed = fixed.replace(inputPattern, '<Input$1>');
    imports.add('Input');
    changed = true;
  }
  
  return { content: fixed, changed };
}

/**
 * Auto-fix RAW_TEXTAREA: Replace <textarea> with <Textarea>
 */
function fixRawTextarea(content, imports) {
  let fixed = content;
  let changed = false;
  
  // Replace <textarea with <Textarea and </textarea> with </Textarea>
  if (/<textarea(\s|>)/.test(fixed)) {
    fixed = fixed.replace(/<textarea(\s+[^>]*)?>/g, '<Textarea$1>');
    fixed = fixed.replace(/<\/textarea>/g, '</Textarea>');
    imports.add('Textarea');
    changed = true;
  }
  
  return { content: fixed, changed };
}

/**
 * Auto-fix RAW_LABEL: Replace <label> with <Label>
 */
function fixRawLabel(content, imports) {
  let fixed = content;
  let changed = false;
  
  // Replace <label with <Label and </label> with </Label>
  if (/<label(\s|>)/.test(fixed)) {
    fixed = fixed.replace(/<label(\s+[^>]*)?>/g, '<Label$1>');
    fixed = fixed.replace(/<\/label>/g, '</Label>');
    imports.add('Label');
    changed = true;
  }
  
  return { content: fixed, changed };
}

/**
 * Auto-fix DIRECT_RADIX: Replace @radix-ui imports with @afenda/ui
 */
function fixDirectRadix(content, imports) {
  let fixed = content;
  let changed = false;
  
  // Find Radix imports and extract component names
  const radixImportPattern = /import\s+\*\s+as\s+(\w+)\s+from\s+["']@radix-ui\/react-(\w+)["'];?/g;
  const matches = [...fixed.matchAll(radixImportPattern)];
  
  for (const match of matches) {
    const [fullMatch, alias, component] = match;
    // Map common Radix components to shadcn names
    const componentMap = {
      'switch': 'Switch',
      'checkbox': 'Checkbox',
      'select': 'Select',
      'dialog': 'Dialog',
      'label': 'Label',
      'separator': 'Separator',
      'tabs': 'Tabs',
      'tooltip': 'Tooltip',
    };
    
    if (componentMap[component]) {
      // Remove the Radix import line
      fixed = fixed.replace(fullMatch, '');
      imports.add(componentMap[component]);
      changed = true;
    }
  }
  
  return { content: fixed, changed };
}

/**
 * Add missing imports to file
 */
function addMissingImports(content, imports) {
  if (imports.size === 0) return content;
  
  const importList = Array.from(imports).sort().join(', ');
  const importStatement = `import { ${importList} } from "@afenda/ui";\n`;
  
  // Find existing imports section
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i]) || /^import\s*\{/.test(lines[i])) {
      lastImportIndex = i;
    }
  }
  
  // Check if @afenda/ui import already exists
  const existingAfendaImport = lines.findIndex(line => 
    /import\s+\{[^}]*\}\s+from\s+["']@afenda\/ui["']/.test(line)
  );
  
  if (existingAfendaImport !== -1) {
    // Merge with existing import
    const existingLine = lines[existingAfendaImport];
    const existingImports = existingLine.match(/\{([^}]+)\}/)?.[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean) || [];
    
    const allImports = [...new Set([...existingImports, ...imports])].sort();
    lines[existingAfendaImport] = `import { ${allImports.join(', ')} } from "@afenda/ui";`;
  } else {
    // Add new import after last import or at top
    const insertIndex = lastImportIndex >= 0 ? lastImportIndex + 1 : 0;
    lines.splice(insertIndex, 0, importStatement.trim());
  }
  
  return lines.join('\n');
}

/**
 * Auto-fix INLINE_STYLES: Remove common hardcoded inline styles
 * (Conservative - only fixes obvious cases)
 */
function fixInlineStyles(content) {
  let fixed = content;
  let changed = false;
  
  // Map common inline styles to Tailwind classes
  const styleToClass = [
    // Colors
    { pattern: /style=\{\{\s*backgroundColor:\s*["']#?ff0000["']\s*\}\}/g, replacement: 'className="bg-red-500"', desc: 'red background' },
    { pattern: /style=\{\{\s*color:\s*["']#?ff0000["']\s*\}\}/g, replacement: 'className="text-red-500"', desc: 'red text' },
    
    // Common spacing (conservative - only exact matches)
    { pattern: /style=\{\{\s*padding:\s*["']20px["']\s*\}\}/g, replacement: 'className="p-5"', desc: 'padding' },
    { pattern: /style=\{\{\s*margin:\s*["']20px["']\s*\}\}/g, replacement: 'className="m-5"', desc: 'margin' },
  ];
  
  for (const { pattern, replacement, desc } of styleToClass) {
    if (pattern.test(fixed)) {
      fixed = fixed.replace(pattern, replacement);
      changed = true;
      console.log(`  • Replaced inline ${desc} with Tailwind class`);
    }
  }
  
  return { content: fixed, changed };
}

// --- Main Scanner -----------------------------------------------------------

const EXCLUDE_PATTERNS = [
  /packages[/\\]ui[/\\]src[/\\]components[/\\]/, // shadcn component sources
  /__vitest_test__[/\\]/,  // test files
  /\.test\.[jt]sx?$/,      // test files
  /\.spec\.[jt]sx?$/,      // test files  
  /e2e[/\\]/,              // e2e tests
];

function shouldSkipFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function autoFixFile(filePath) {
  if (shouldSkipFile(filePath)) return false;
  
  const source = readFileSync(filePath, "utf8");
  const relPath = relative(ROOT, filePath);
  
  let content = source;
  let totalChanges = 0;
  const imports = new Set();
  
  console.log(`\nProcessing: ${relPath}`);
  
  // Apply safe auto-fixes
  const fixes = [
    { name: 'RAW_INPUT', fn: fixRawInput },
    { name: 'RAW_TEXTAREA', fn: fixRawTextarea },
    { name: 'RAW_LABEL', fn: fixRawLabel },
  ];
  
  if (!safeOnly) {
    fixes.push(
      { name: 'DIRECT_RADIX', fn: fixDirectRadix },
      { name: 'INLINE_STYLES', fn: fixInlineStyles }
    );
  }
  
  for (const { name, fn } of fixes) {
    const result = fn(content, imports);
    if (result.changed) {
      content = result.content;
      totalChanges++;
      console.log(`  ✓ Fixed ${name} violations`);
    }
  }
  
  // Add missing imports
  if (imports.size > 0) {
    content = addMissingImports(content, imports);
    console.log(`  ✓ Added imports: ${Array.from(imports).join(', ')}`);
    totalChanges++;
  }
  
  // Write back if changes were made
  if (totalChanges > 0) {
    if (!isDryRun) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`  💾 Saved ${totalChanges} fix(es)`);
    } else {
      console.log(`  🔍 Would save ${totalChanges} fix(es) (dry-run)`);
    }
    return true;
  }
  
  return false;
}

// --- Main Execution ---------------------------------------------------------

console.log('🔧 shadcn-enforcement Auto-Fix Utility\n');
console.log(`Mode: ${isDryRun ? 'DRY-RUN (no changes)' : 'LIVE (will modify files)'}`);
console.log(`Safety: ${safeOnly ? 'SAFE ONLY' : 'UNSAFE ALLOWED'}\n`);

const SCAN_DIRS = [
  resolve(ROOT, "packages/ui/src"),
  resolve(ROOT, "apps/web/src"),
];

let filesFixed = 0;
let filesScanned = 0;

for (const dir of SCAN_DIRS) {
  const files = walkTs(dir);
  for (const file of files) {
    filesScanned++;
    const wasFixed = autoFixFile(file);
    if (wasFixed) filesFixed++;
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`📊 Summary:`);
console.log(`   Files scanned: ${filesScanned}`);
console.log(`   Files fixed:   ${filesFixed}`);
console.log(`   Mode:          ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);

if (isDryRun && filesFixed > 0) {
  console.log(`\n💡 Run without --dry-run to apply fixes`);
}

console.log('');
process.exit(0);
