#!/usr/bin/env node
/**
 * tools/gates/token-compliance-autofix.mjs
 *
 * Auto-fix utility for token-compliance violations with semantic color mapping.
 *
 * Usage:
 *   node tools/gates/token-compliance-autofix.mjs [--dry-run] [--interactive]
 *
 * Flags:
 *   --dry-run        Show what would be fixed without making changes
 *   --interactive    Prompt for semantic choices on ambiguous mappings
 *   --generate-review  Generate manual review queue markdown
 *
 * Fix Tiers:
 *   SAFE (auto):     dark: prefix removal, high-confidence semantic mappings
 *   CONTEXTUAL:      Requires --interactive for semantic choices
 *   MANUAL:          Flagged for developer review (generated with --generate-review)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

import { walkTs } from "../lib/walk.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const isDryRun = process.argv.includes("--dry-run");
const isInteractive = process.argv.includes("--interactive");
const generateReview = process.argv.includes("--generate-review");

const SCAN_DIRS = [
  resolve(ROOT, "apps/web/src"),
  resolve(ROOT, "packages/ui/src"),
];

const EXCLUDE_PATTERNS = [
  /[/\\]_tokens-/,                // Design system token definitions
  /[/\\]_theme\.css$/,
  /[/\\]_variants\.css$/,
  /[/\\]_base\.css$/,
  /[/\\]_utilities\.css$/,
  /\.test\.(tsx?|jsx?)$/,
  /[/\\]__vitest_test__[/\\]/,
  /[/\\]e2e[/\\]/,
  /[/\\]\(marketing\)[/\\]/,      // Marketing pages use curated palette
];

// ─── Color Mapping Rules ─────────────────────────────────────────────────────

/**
 * TIER 1: SAFE AUTO-FIX MAPPINGS
 * High confidence semantic mappings that can be applied automatically
 */
const SAFE_SEMANTIC_MAP = {
  // ═══ Status Colors (highest confidence) ═══
  // Success/operational states
  'text-green-600': 'text-success',
  'text-green-500': 'text-success',
  'bg-green-600': 'bg-success',
  'bg-green-500': 'bg-success',
  'border-green-600': 'border-success',
  'text-teal-500': 'text-success',
  'text-teal-600': 'text-success',
  
  // Destructive/error states
  'text-red-600': 'text-destructive',
  'text-red-500': 'text-destructive',
  'bg-red-600': 'bg-destructive',
  'bg-red-500': 'bg-destructive',
  'border-red-600': 'border-destructive',
  
  // Warning/caution states
  'text-yellow-600': 'text-warning',
  'text-yellow-500': 'text-warning',
  'text-amber-600': 'text-warning',
  'text-amber-500': 'text-warning',
  'text-orange-600': 'text-warning',
  'text-orange-500': 'text-warning',
  'bg-yellow-600': 'bg-warning',
  'bg-amber-600': 'bg-warning',
  'border-yellow-600': 'border-warning',
  
  // ═══ Information/Info Colors (high confidence for info content) ═══
  'text-blue-600': 'text-info',
  'text-blue-500': 'text-info',
  'text-cyan-600': 'text-info',
  'text-cyan-500': 'text-info',
  'bg-blue-600': 'bg-info',
  'bg-blue-500': 'bg-info',
  'border-blue-600': 'border-info',
  'border-blue-200': 'border-border',
  'bg-blue-50': 'bg-accent',
  
  // ═══ Primary/Brand Colors (indigo commonly used for brand) ═══
  'text-indigo-600': 'text-primary',
  'text-indigo-500': 'text-primary',
  'text-indigo-900': 'text-primary',
  'bg-indigo-600': 'bg-primary',
  'bg-indigo-50': 'bg-accent',
  'border-indigo-600': 'border-primary',
  
  // ═══ Purple (treat as primary for most AFENDA contexts) ═══
  'text-purple-600': 'text-primary',
  'text-purple-500': 'text-primary',
  'bg-purple-600': 'bg-primary',
  'border-purple-600': 'border-primary',
  
  // ═══ Surface & Border Tokens ═══
  'bg-gray-50': 'bg-surface-50',
  'bg-gray-100': 'bg-surface-100',
  'bg-gray-200': 'bg-surface-200',
  'bg-slate-50': 'bg-surface-50',
  'bg-white': 'bg-background',
  
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border-strong',
  'border-slate-200': 'border-border',
  
  // ═══ Text Colors ═══
  'text-gray-600': 'text-foreground-secondary',
  'text-gray-700': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-900': 'text-foreground',
  'text-slate-600': 'text-foreground-secondary',
  'text-black': 'text-foreground',
  
  // ═══ Dark mode text colors (should be removed via dark: prefix, but may appear standalone) ═══
  'text-blue-100': 'text-info',
  'text-blue-200': 'text-info',
  'text-blue-800': 'text-info',
  'text-blue-900': 'text-info',
  'text-indigo-800': 'text-primary',
};

/**
 * TIER 2: CONTEXTUAL MAPPINGS
 * Ambiguous cases that need context/human choice
 * Each provides multiple semantic options
 * 
 * NOTE: Most blue/indigo/purple moved to SAFE_SEMANTIC_MAP.
 * Only truly ambiguous cases remain here.
 */
const CONTEXTUAL_MAP = {
  // Orange could be warning or accent
  'text-orange-600': [
    { token: 'text-warning', use: 'warning states, caution' },
    { token: 'text-accent', use: 'accent highlights' },
  ],
  'bg-orange-600': [
    { token: 'bg-warning', use: 'warning backgrounds' },
    { token: 'bg-accent', use: 'accent surfaces' },
  ],
};

/**
 * DARK MODE PREFIX REMOVAL
 * All dark: prefixes should be stripped - DS tokens handle dark mode
 * Handles: dark:text-*, dark:bg-*, dark:hover:*, dark:aria-invalid:*, etc.
 */
const DARK_PREFIX_STRIP_PATTERN = /\s*dark:(?:[a-z][\w-]*:)*[a-z][\w-]*(?:\/\d+)?/g;

/**
 * INLINE HEX TO CSS VAR MAPPINGS
 */
const HEX_TO_VAR = {
  '#000000': 'var(--foreground)',
  '#000': 'var(--foreground)',
  '#ffffff': 'var(--background)',
  '#fff': 'var(--background)',
  '#f00': 'var(--destructive)',
  '#ff0000': 'var(--destructive)',
  '#0f0': 'var(--success)',
  '#00ff00': 'var(--success)',
};

// ─── Auto-Fix Functions ──────────────────────────────────────────────────────

/**
 * Remove all dark: variant prefixes from className strings
 */
function removeDarkPrefixes(content) {
  let fixed = content;
  let count = 0;
  
  // Match className="..." or className={...}
  const classNamePattern = /className=["'`]([^"'`]+)["'`]/g;
  
  fixed = fixed.replace(classNamePattern, (match, classes) => {
    if (DARK_PREFIX_STRIP_PATTERN.test(classes)) {
      count++;
      const cleaned = classes.replace(DARK_PREFIX_STRIP_PATTERN, '').replace(/\s+/g, ' ').trim();
      return `className="${cleaned}"`;
    }
    return match;
  });
  
  // Also handle template literals: className={`...`}
  const templatePattern = /className=\{`([^`]+)`\}/g;
  fixed = fixed.replace(templatePattern, (match, classes) => {
    if (DARK_PREFIX_STRIP_PATTERN.test(classes)) {
      count++;
      const cleaned = classes.replace(DARK_PREFIX_STRIP_PATTERN, '').replace(/\s+/g, ' ').trim();
      return `className={\`${cleaned}\`}`;
    }
    return match;
  });
  
  return { content: fixed, count };
}

/**
 * Apply safe semantic color mappings
 */
function applySafeSemanticMappings(content) {
  let fixed = content;
  const changes = [];
  
  for (const [oldClass, newClass] of Object.entries(SAFE_SEMANTIC_MAP)) {
    const pattern = new RegExp(`\\b${escapeRegex(oldClass)}\\b`, 'g');
    const matches = [...fixed.matchAll(pattern)];
    
    if (matches.length > 0) {
      fixed = fixed.replace(pattern, newClass);
      changes.push({ old: oldClass, new: newClass, count: matches.length });
    }
  }
  
  return { content: fixed, changes };
}

/**
 * Convert inline hex colors in style objects to CSS variables
 */
function convertInlineHex(content) {
  let fixed = content;
  const changes = [];
  
  // Match: color: "#hex" or backgroundColor: "#hex" etc
  for (const [hex, cssVar] of Object.entries(HEX_TO_VAR)) {
    const patterns = [
      new RegExp(`(color|backgroundColor|borderColor):\\s*["']${escapeRegex(hex)}["']`, 'gi'),
    ];
    
    for (const pattern of patterns) {
      const matches = [...fixed.matchAll(pattern)];
      if (matches.length > 0) {
        fixed = fixed.replace(pattern, `$1: "${cssVar}"`);
        changes.push({ hex, cssVar, count: matches.length });
      }
    }
  }
  
  return { content: fixed, changes };
}

/**
 * Detect contextual mappings that need human decision
 */
function detectContextualCases(content, filePath) {
  const cases = [];
  const lines = content.split('\n');
  
  for (const [oldClass, options] of Object.entries(CONTEXTUAL_MAP)) {
    const pattern = new RegExp(`\\b${escapeRegex(oldClass)}\\b`, 'g');
    
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        cases.push({
          file: filePath,
          line: idx + 1,
          oldClass,
          options,
          context: getLineContext(lines, idx),
        });
      }
    });
  }
  
  return cases;
}

// ─── Interactive Helpers ─────────────────────────────────────────────────────

function getLineContext(lines, idx, contextSize = 2) {
  const start = Math.max(0, idx - contextSize);
  const end = Math.min(lines.length, idx + contextSize + 1);
  return lines.slice(start, end).map((l, i) => ({
    lineNum: start + i + 1,
    text: l,
    isCurrent: start + i === idx,
  }));
}

async function promptSemanticChoice(caseData) {
  const { file, line, oldClass, options, context } = caseData;
  
  console.log('\n' + '═'.repeat(80));
  console.log(`📍 ${relative(ROOT, file)}:${line}`);
  console.log('─'.repeat(80));
  
  // Show context
  context.forEach(({ lineNum, text, isCurrent }) => {
    const marker = isCurrent ? '►' : ' ';
    console.log(`${marker} ${String(lineNum).padStart(4)} │ ${text}`);
  });
  
  console.log('─'.repeat(80));
  console.log(`Current: ${oldClass}`);
  console.log('\nChoose replacement:');
  
  options.forEach((opt, i) => {
    console.log(`  [${i + 1}] ${opt.token.padEnd(25)} - ${opt.use}`);
  });
  console.log(`  [s] Skip this occurrence`);
  console.log(`  [a] Skip all ${oldClass} (add to manual review)`);
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question('\nYour choice: ', (answer) => {
      rl.close();
      
      const choice = answer.trim().toLowerCase();
      if (choice === 's') {
        resolve({ action: 'skip' });
      } else if (choice === 'a') {
        resolve({ action: 'skip-all', class: oldClass });
      } else {
        const idx = parseInt(choice, 10) - 1;
        if (idx >= 0 && idx < options.length) {
          resolve({ action: 'replace', token: options[idx].token });
        } else {
          console.log('Invalid choice, skipping...');
          resolve({ action: 'skip' });
        }
      }
    });
  });
}

async function handleInteractiveCases(content, cases) {
  let fixed = content;
  const skipAll = new Set();
  const manualReview = [];
  
  for (const caseData of cases) {
    if (skipAll.has(caseData.oldClass)) {
      manualReview.push(caseData);
      continue;
    }
    
    const decision = await promptSemanticChoice(caseData);
    
    if (decision.action === 'skip-all') {
      skipAll.add(decision.class);
      manualReview.push(caseData);
    } else if (decision.action === 'replace') {
      // Replace this specific occurrence
      const lines = fixed.split('\n');
      const line = lines[caseData.line - 1];
      lines[caseData.line - 1] = line.replace(
        new RegExp(`\\b${escapeRegex(caseData.oldClass)}\\b`),
        decision.token
      );
      fixed = lines.join('\n');
      console.log(`✓ Replaced with ${decision.token}`);
    }
  }
  
  return { content: fixed, manualReview };
}

// ─── Manual Review Queue ─────────────────────────────────────────────────────

function generateManualReviewQueue(cases) {
  let markdown = `# Token Compliance - Manual Review Queue\n`;
  markdown += `Generated: ${new Date().toISOString().split('T')[0]}\n`;
  markdown += `Total cases requiring review: ${cases.length}\n\n`;
  markdown += `---\n\n`;
  
  cases.forEach((caseData, idx) => {
    const { file, line, oldClass, options, context } = caseData;
    
    markdown += `## ${idx + 1}. ${relative(ROOT, file)}:${line}\n\n`;
    markdown += `\`\`\`tsx\n`;
    context.forEach(({ lineNum, text, isCurrent }) => {
      const marker = isCurrent ? '// ► LINE ' + lineNum : '//   ' + lineNum;
      markdown += `${marker.padEnd(12)} ${text}\n`;
    });
    markdown += `\`\`\`\n\n`;
    markdown += `**Current:** \`${oldClass}\`\n\n`;
    markdown += `**Options:**\n`;
    options.forEach((opt) => {
      markdown += `- \`${opt.token}\` — ${opt.use}\n`;
    });
    markdown += `\n**Decision:** \`text-_______\`\n\n`;
    markdown += `---\n\n`;
  });
  
  return markdown;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldExclude(absPath) {
  return EXCLUDE_PATTERNS.some(p => p.test(absPath));
}

// ─── Main Processor ──────────────────────────────────────────────────────────

async function processFile(filePath) {
  const relPath = relative(ROOT, filePath);
  const source = readFileSync(filePath, 'utf-8');
  
  let content = source;
  let totalChanges = 0;
  const report = { file: relPath, fixes: [] };
  
  console.log(`\n📄 Processing: ${relPath}`);
  
  // ══ TIER 1: Remove dark: prefixes ═══
  const darkResult = removeDarkPrefixes(content);
  if (darkResult.count > 0) {
    content = darkResult.content;
    totalChanges += darkResult.count;
    report.fixes.push(`Removed ${darkResult.count} dark: prefix(es)`);
    console.log(`  ✓ Removed ${darkResult.count} dark: prefix(es)`);
  }
  
  // ══ TIER 2: Safe semantic mappings ══
  const semanticResult = applySafeSemanticMappings(content);
  if (semanticResult.changes.length > 0) {
    content = semanticResult.content;
    semanticResult.changes.forEach(({ old, new: newClass, count }) => {
      totalChanges += count;
      report.fixes.push(`${old} → ${newClass} (${count}x)`);
      console.log(`  ✓ ${old} → ${newClass} (${count}x)`);
    });
  }
  
  // ══ TIER 3: Inline hex conversion ══
  const hexResult = convertInlineHex(content);
  if (hexResult.changes.length > 0) {
    content = hexResult.content;
    hexResult.changes.forEach(({ hex, cssVar, count }) => {
      totalChanges += count;
      report.fixes.push(`${hex} → ${cssVar} (${count}x)`);
      console.log(`  ✓ ${hex} → ${cssVar} (${count}x)`);
    });
  }
  
  // ══ TIER 4: Detect contextual cases ══
  const contextualCases = detectContextualCases(content, filePath);
  
  if (isInteractive && contextualCases.length > 0) {
    console.log(`  ⚠ Found ${contextualCases.length} contextual case(s) requiring decision`);
    const interactiveResult = await handleInteractiveCases(content, contextualCases);
    content = interactiveResult.content;
    
    if (interactiveResult.manualReview.length > 0) {
      return {
        content,
        changed: content !== source,
        report,
        manualReview: interactiveResult.manualReview,
      };
    }
  } else if (contextualCases.length > 0) {
    console.log(`  ℹ Found ${contextualCases.length} contextual case(s) - use --interactive or --generate-review`);
    return {
      content,
      changed: content !== source,
      report,
      manualReview: contextualCases,
    };
  }
  
  if (totalChanges === 0) {
    console.log('  No fixes needed');
  }
  
  return {
    content,
    changed: content !== source,
    report,
    manualReview: contextualCases,
  };
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     TOKEN COMPLIANCE AUTO-FIX                                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY FIXES'}`);
  console.log(`Interactive: ${isInteractive ? 'YES' : 'NO'}`);
  console.log(`Generate Review: ${generateReview ? 'YES' : 'NO'}`);
  console.log();
  
  const files = [];
  for (const dir of SCAN_DIRS) {
    for (const absPath of walkTs(dir)) {
      if (!shouldExclude(absPath) && /\.(tsx|jsx)$/.test(absPath)) {
        files.push(absPath);
      }
    }
  }
  
  console.log(`Scanning ${files.length} component files...\n`);
  
  let fixedCount = 0;
  let totalChanges = 0;
  const allManualReview = [];
  const reports = [];
  
  for (const file of files) {
    const result = await processFile(file);
    
    if (result.changed) {
      fixedCount++;
      reports.push(result.report);
      
      if (!isDryRun) {
        writeFileSync(file, result.content, 'utf-8');
      }
    }
    
    if (result.manualReview.length > 0) {
      allManualReview.push(...result.manualReview);
    }
  }
  
  // ══ Summary ══
  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Files scanned:       ${files.length}`);
  console.log(`Files modified:      ${fixedCount}`);
  console.log(`Manual review cases: ${allManualReview.length}`);
  console.log();
  
  if (reports.length > 0) {
    console.log('Fixes applied:');
    reports.forEach(({ file, fixes }) => {
      console.log(`  ${file}`);
      fixes.forEach(fix => console.log(`    - ${fix}`));
    });
  }
  
  if (generateReview && allManualReview.length > 0) {
    const reviewPath = resolve(ROOT, 'token-compliance-manual-review.md');
    const markdown = generateManualReviewQueue(allManualReview);
    writeFileSync(reviewPath, markdown, 'utf-8');
    console.log(`\n✓ Manual review queue written to: ${relative(ROOT, reviewPath)}`);
  }
  
  if (isDryRun && fixedCount > 0) {
    console.log('\n⚠ DRY RUN - No files were modified');
    console.log('Remove --dry-run to apply fixes');
  }
  
  console.log('═'.repeat(80));
}

main().catch(console.error);
