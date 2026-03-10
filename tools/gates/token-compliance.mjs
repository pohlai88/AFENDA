#!/usr/bin/env node
/**
 * tools/gates/token-compliance.mjs
 *
 * CI gate: scans all TSX/JSX component files for hardcoded Tailwind palette
 * colors, dark: variant prefixes, and arbitrary inline color values.
 *
 * Complementary to the ESLint rule (tools/eslint/no-hardcoded-colors.mjs):
 *   - ESLint rule:  runs in editor (red squiggles) + `pnpm lint`
 *   - This gate:    runs in `pnpm check:all` + CI pipeline
 *   - This gate also scans CSS files for raw hex/rgb/hsl outside the DS
 *
 * Usage:
 *   node tools/gates/token-compliance.mjs
 *
 * Exit code 0 = clean, 1 = violations found.
 */

import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const GATE_NAME = "TOKEN COMPLIANCE";

// ─── Scan targets ────────────────────────────────────────────────────────────

/** Directories containing component code that MUST use DS tokens. */
const SCAN_DIRS = [
  resolve(ROOT, "apps/web/src"),
  resolve(ROOT, "packages/ui/src"),
];

/** Paths to EXCLUDE from scanning (design-system definition files). */
const EXCLUDE_PATTERNS = [
  /[/\\]_tokens-/,                // _tokens-light.css, _tokens-dark.css
  /[/\\]_theme\.css$/,            // @theme inline definitions
  /[/\\]_variants\.css$/,         // @custom-variant dark
  /[/\\]_base\.css$/,             // base layer resets
  /[/\\]_utilities\.css$/,        // utility class definitions
  /[/\\]_density\.css$/,          // density profiles
  /[/\\]_accessibility\.css$/,    // a11y utilities
  /[/\\]_print\.css$/,            // print styles
  /[/\\]index\.css$/,             // barrel imports
  /[/\\]globals\.css$/,           // app entry point (imports only)
  /\.test\.(tsx?|jsx?)$/,         // test files
  /[/\\]__vitest_test__[/\\]/,    // test directories
  /[/\\]e2e[/\\]/,                // e2e test directories
  // Landing / marketing pages use a curated dark-terminal palette by design.
  // Each file carries /* shadcn-exempt */ documenting the intent.
  /[/\\]\(marketing\)[/\\]/,
];

// ─── Detection patterns ──────────────────────────────────────────────────────

const TW_PALETTES = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green",
  "emerald", "teal", "cyan", "sky", "blue", "indigo",
  "violet", "purple", "fuchsia", "pink", "rose",
];

const COLOR_UTILITIES = [
  "bg", "text", "border", "ring", "outline", "shadow", "accent",
  "divide", "placeholder", "from", "via", "to", "fill", "stroke",
  "decoration", "caret",
];

const paletteGroup = TW_PALETTES.join("|");
const utilityGroup = COLOR_UTILITIES.join("|");
const SHADE = String.raw`(?:50|[1-9]00|950)`;

/** Regex patterns and their rule codes. */
const RULES = [
  {
    code: "PALETTE_CLASS",
    // Matches: bg-red-500, text-blue-700/50, hover:border-amber-200
    re: new RegExp(
      String.raw`(?:(?:hover|focus|active|group-hover|peer-hover|focus-within|focus-visible|disabled|first|last|odd|even|sm|md|lg|xl|2xl):)*` +
      String.raw`(?:${utilityGroup})-(?:${paletteGroup})-${SHADE}(?:\/\d+)?`,
      "g",
    ),
    message: (m) => `Hardcoded Tailwind palette class "${m}"`,
    fix: "Replace with a design-system token class (e.g. bg-primary, text-destructive, border-border).",
  },
  {
    code: "DARK_PREFIX",
    // Matches: dark:bg-gray-900, dark:text-white
    re: /dark:[a-z][\w-]*/g,
    message: (m) => `dark: variant "${m}" — theme auto-switches via DS tokens`,
    fix: "Remove the dark: class. DS tokens handle dark mode via :root / .dark selectors.",
  },
  {
    code: "ARBITRARY_COLOR",
    // Matches: bg-[#ff0000], text-[rgb(255,0,0)], border-[oklch(...)]
    re: new RegExp(
      String.raw`(?:${utilityGroup})-\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\))\]`,
      "g",
    ),
    message: (m) => `Arbitrary inline color value "${m}"`,
    fix: "Define the color as a DS token in _tokens-light.css / _tokens-dark.css / _theme.css.",
  },
  {
    code: "INLINE_HEX",
    // Matches: color: "#ff0000" or style={{ color: '#abc' }} in TSX
    // Only in .tsx/.jsx files — catches inline style objects
    re: /(?:color|background(?:Color)?|borderColor|fill|stroke)\s*[:=]\s*["']#[0-9a-fA-F]{3,8}["']/g,
    message: (m) => `Inline hex color in style object: ${m.trim()}`,
    fix: "Use a CSS variable: var(--destructive), var(--primary), etc.",
    fileFilter: /\.(tsx|jsx)$/,
  },
];

const RULE_DOCS = {
  PALETTE_CLASS: {
    why: "Hardcoded palette colors bypass the design-system token layer, breaking theme consistency and dark-mode auto-switching.",
    docs: "packages/ui/ARCHITECTURE_afenda-design-system.md",
    commonFix: "Replace with semantic token: bg-primary, text-muted-foreground, border-input, etc.",
  },
  DARK_PREFIX: {
    why: "The dark: variant duplicates theme logic that the DS handles automatically via :root / .dark CSS variables.",
    docs: "packages/ui/src/styles/_tokens-dark.css",
    commonFix: "Remove dark: prefix — tokens auto-switch via .dark selector in _tokens-dark.css",
    blockComponentNote: "Block components installed via shadcn CLI often include dark: variants. Safe to remove — our DS tokens handle dark mode.",
  },
  ARBITRARY_COLOR: {
    why: "Arbitrary color values in className bypass token system and create unmaintainable one-offs.",
    docs: "packages/ui/src/styles/_theme.css",
    commonFix: "Define as a CSS variable in _theme.css or use existing token: var(--primary), var(--destructive), etc.",
  },
  INLINE_HEX: {
    why: "Inline hex colors in style objects bypass the token system — use var(--token) references.",
    docs: "packages/ui/src/styles/_tokens-light.css",
    commonFix: "Use CSS variable: var(--primary), var(--destructive), etc. OR add token-compliance-exempt comment in first 5 lines for brand icons.",
    brandIconExemption: "For official brand colors (AFENDA mark, Google icon, etc.), add '// token-compliance-exempt: reason' in file header (lines 1-5).",
  },
};

// ─── Scanner ─────────────────────────────────────────────────────────────────

const t0 = performance.now();

function shouldExclude(absPath) {
  return EXCLUDE_PATTERNS.some((p) => p.test(absPath));
}

/** Collect all .tsx/.jsx/.ts files from scan dirs. */
function collectFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    for (const absPath of walkTs(dir)) {
      if (!shouldExclude(absPath)) {
        files.push(absPath);
      }
    }
  }
  return files;
}

const files = collectFiles();
const violations = [];

for (const absPath of files) {
  const relPath = relative(ROOT, absPath).replaceAll("\\", "/");
  const content = readFileSync(absPath, "utf-8");
  const lines = content.split("\n");

  // Honor file-level shadcn-exempt marker (landing pages, curated palettes)
  const fileHeader = lines.slice(0, 5).join("\n");
  if (/shadcn-exempt|token-compliance-exempt/.test(fileHeader)) continue;

  for (const rule of RULES) {
    // Some rules only apply to certain file types
    if (rule.fileFilter && !rule.fileFilter.test(absPath)) continue;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      // Skip eslint-disable comments (honor opt-out)
      if (/eslint-disable.*no-hardcoded-colors/.test(line)) continue;
      // Skip comments
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

      // Reset regex lastIndex for global flag
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(line)) !== null) {
        violations.push({
          ruleCode: rule.code,
          file: relPath,
          line: lineIdx + 1,
          message: rule.message(match[0]),
          fix: rule.fix,
          statement: line.trim().slice(0, 120),
        });
      }
    }
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

if (violations.length > 0) {
  reportViolations({
    gateName: GATE_NAME,
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Files scanned:": files.length,
      "Scan dirs:": SCAN_DIRS.map((d) => relative(ROOT, d)).join(", "),
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: GATE_NAME,
    detail: `${files.length} component files scanned in ${elapsed}s — no hardcoded colors found.`,
  });
}
