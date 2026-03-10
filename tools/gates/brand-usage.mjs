#!/usr/bin/env node
/**
 * tools/gates/brand-usage.mjs
 *
 * CI gate: enforces unified AFENDA brand component usage.
 * Prevents regression to fragmented inline brand rendering.
 *
 * --- Rules ------------------------------------------------------------------
 *
 *  1. DIRECT_AFENDAMARK  — Importing AfendaMark directly is restricted to
 *                          AfendaLogo.tsx and Hero.tsx. All other files must
 *                          use <AfendaLogo> from ./AfendaLogo instead.
 *
 *  2. INLINE_BRAND_TEXT  — Inline rendering of the brand name "AFENDA" in
 *                          visible JSX (e.g. <span>AFENDA</span>) should use
 *                          <AfendaLogo> to keep the lock-up proportional.
 *                          Allowed: aria-label, metadata, alt-text, prose.
 *
 *  3. INLINE_TAGLINE     — The tagline "Where numbers become canon" must NOT
 *                          be rendered inline. Use <AfendaLogo showTagline>.
 *
 *  4. WRONG_SVG_GEOMETRY — Direct SVG brand marks must use the correct
 *                          geometry: dot1 r=2, dot2 r=2, ring r=2.5 with
 *                          strokeWidth=1.5. Catches copy-paste drift.
 *
 * --- Exemptions -------------------------------------------------------------
 *
 *  - AfendaMark.tsx itself      — defines the raw SVG component
 *  - AfendaLogo.tsx             — composes AfendaMark (allowed import)
 *  - Hero.tsx                   — approved standalone large-format usage
 *  - auth-loading-brand.tsx     — thin wrapper around AfendaLogo
 *  - Test files                 — __vitest_test__/, *.test.*, e2e/
 *  - Layout/metadata files      — layout.tsx, global-error.tsx
 *  - Config files               — *.config.*
 *  - Type definition files      — *.d.ts
 *  - Non-TSX files              — only scan .tsx (JSX rendering)
 *  - Sections with brand-exempt — manual exemption marker
 *
 * Usage:
 *   node tools/gates/brand-usage.mjs
 *
 * Exit code 0 = clean, 1 = violations found.
 */

import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// --- Config -----------------------------------------------------------------

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const GATE_NAME = "BRAND USAGE";

// --- Scan targets -----------------------------------------------------------

const SCAN_DIRS = [
  resolve(ROOT, "apps/web/src"),
  resolve(ROOT, "packages/ui/src"),
];

// --- Allowed direct AfendaMark consumers ------------------------------------

/** Only these files (basename) may import AfendaMark directly. */
const ALLOWED_AFENDAMARK_FILES = new Set([
  "AfendaMark.tsx",       // Defines the component
  "AfendaLogo.tsx",       // Composes AfendaMark into the lock-up
  "Hero.tsx",             // Approved standalone 64px animated icon
]);

// --- Exclusion patterns -----------------------------------------------------

const EXCLUDE_PATTERNS = [
  // Test files
  /\.test\.(tsx?|jsx?)$/,
  /\.spec\.(tsx?|jsx?)$/,
  /[/\\]__vitest_test__[/\\]/,
  /[/\\]e2e[/\\]/,
  /[/\\]__tests__[/\\]/,

  // Generated / structural Next.js files
  /[/\\]layout\.tsx$/,
  /[/\\]global-error\.tsx$/,
  /[/\\]_app\.(tsx?)$/,
  /[/\\]_document\.(tsx?)$/,
  /[/\\]middleware\.(tsx?)$/,

  // Config and type definitions
  /\.config\.(tsx?|jsx?|mjs|cjs)$/,
  /\.d\.ts$/,

  // Preview / static HTML files (not .tsx)
  /\.html$/,
];

// --- Exemption marker -------------------------------------------------------

function hasExemptMarker(lines, lineIndex) {
  const searchStart = Math.max(0, lineIndex - 10);
  const searchContent = lines.slice(searchStart, lineIndex + 1).join("\n");
  return (
    /\/\*\s*brand-exempt\s*\*\//.test(searchContent) ||
    /\/\/\s*brand-exempt/.test(searchContent) ||
    /<!--\s*brand-exempt\s*-->/.test(searchContent)
  );
}

// --- Detection functions ----------------------------------------------------

/**
 * Rule 1: DIRECT_AFENDAMARK
 * Detects direct import of AfendaMark from files that are not in the allowed set.
 */
function detectDirectAfendaMark(line, fileName) {
  if (ALLOWED_AFENDAMARK_FILES.has(fileName)) return null;

  // Match: import { AfendaMark } from "./AfendaMark"
  //   or:  import { AfendaMark } from "../AfendaMark"
  //   or:  import { AfendaMark, ...} from "..."
  if (/import\s+\{[^}]*\bAfendaMark\b[^}]*\}\s+from\s+/.test(line)) {
    return {
      ruleCode: "DIRECT_AFENDAMARK",
      message: "Direct AfendaMark import — use <AfendaLogo> instead",
      fix: `Replace AfendaMark with AfendaLogo: import { AfendaLogo } from "./AfendaLogo" and use <AfendaLogo size="sm" showTagline={false} />`,
    };
  }
  return null;
}

/**
 * Rule 2: INLINE_BRAND_TEXT
 * Detects inline JSX rendering of the brand name "AFENDA" that should use AfendaLogo.
 * Allows: aria-label, alt, metadata objects, prose/paragraph content, comments.
 */
function detectInlineBrandText(line, fileName, filePath) {
  // Skip the AfendaLogo component itself (it renders the brand name)
  if (fileName === "AfendaLogo.tsx") return null;
  // Skip AfendaMark aria-label
  if (fileName === "AfendaMark.tsx") return null;
  // Skip Hero.tsx (approved standalone brand render)
  if (fileName === "Hero.tsx") return null;
  // Skip packages/ui — can't import AfendaLogo per Import Direction Law
  if (/[/\\]packages[/\\]ui[/\\]/.test(filePath)) return null;

  // Must contain AFENDA in a JSX text context
  if (!/AFENDA/.test(line)) return null;

  // Allow: aria-label="AFENDA", alt="AFENDA", title="AFENDA"
  if (/(?:aria-label|alt|title|name|content|placeholder)=["'][^"']*AFENDA/.test(line)) return null;

  // Allow: metadata / config objects — applicationName: "AFENDA", siteName: "AFENDA"
  if (/:\s*["']AFENDA["']/.test(line)) return null;

  // Allow: prose references in <em>, <strong>, <code>, paragraphs of text
  // Heuristic: if line has substantial prose (>80 chars) or is inside <p>/<em>/<li>
  if (/<(?:em|strong|code|p|li|blockquote)[^>]*>/.test(line)) return null;
  if (/\(<em>AFENDA<\/em>\)/.test(line)) return null;

  // Allow: comments (single-line and multi-line)
  if (/^\s*\/\//.test(line) || /^\s*\/?\*/.test(line)) return null;

  // Allow: string interpolation in template literals for non-JSX contexts
  if (/`[^`]*AFENDA[^`]*`/.test(line)) return null;

  // Detect: <span>AFENDA</span>, <h1>AFENDA</h1>, etc. — inline JSX brand text
  if (/<[a-z][a-z0-9]*[^>]*>\s*AFENDA\s*<\//.test(line)) {
    return {
      ruleCode: "INLINE_BRAND_TEXT",
      message: "Inline brand name render — use <AfendaLogo> for consistent lock-up",
      fix: `Replace inline "AFENDA" text with <AfendaLogo size="sm" showTagline={false} />`,
    };
  }

  return null;
}

/**
 * Rule 3: INLINE_TAGLINE
 * Detects inline rendering of the tagline outside of AfendaLogo.
 */
function detectInlineTagline(line, fileName) {
  if (fileName === "AfendaLogo.tsx") return null;
  // Skip Hero.tsx (uses stylized gradient version of tagline)
  if (fileName === "Hero.tsx") return null;

  // Allow comments
  if (/^\s*\/\//.test(line) || /^\s*\/?\*/.test(line)) return null;

  // Allow metadata / config strings (description:, content:, title:)
  if (/^\s*["'].*Where numbers become canon/.test(line)) return null;
  if (/(?:description|content|title|alt)\s*[:=]/.test(line)) return null;

  // Match the canonical tagline in JSX content
  if (/Where numbers become canon/.test(line)) {
    return {
      ruleCode: "INLINE_TAGLINE",
      message: "Inline tagline render — use <AfendaLogo showTagline> instead",
      fix: `Remove inline tagline and use <AfendaLogo showTagline /> which renders the tagline with correct typography`,
    };
  }

  return null;
}

/**
 * Rule 4: WRONG_SVG_GEOMETRY
 * Detects inline SVG circles that look like the AfendaMark but with wrong radii.
 * The correct geometry: dot r=2, ring r=2.5 stroke-width=1.5.
 * Common drift: r=1.5 for ring, r=2.5 for all dots.
 */
function detectWrongSvgGeometry(line) {
  // Only check lines that look like SVG circles in a brand-like pattern
  if (!/<circle/.test(line)) return null;

  // Allow comments
  if (/^\s*\/\//.test(line) || /^\s*\/?\*/.test(line)) return null;

  // Check for ring circle (cx=19) with wrong radius
  if (/cx=["']?19["']?\s/.test(line) && /cy=["']?12["']?/.test(line)) {
    // Ring must be r=2.5 with stroke-width=1.5
    const hasWrongRadius = /r=["']?(?!2\.5["'\s])[\d.]+/.test(line);
    if (hasWrongRadius) {
      return {
        ruleCode: "WRONG_SVG_GEOMETRY",
        message: "Brand icon ring has incorrect radius — must be r=2.5 stroke-width=1.5",
        fix: "Use <AfendaMark /> instead of inline SVG, or fix ring to: r=2.5 stroke-width=1.5 fill=none",
      };
    }
  }

  // Check for dot circles (cx=5 or cx=12) with wrong radius
  if ((/cx=["']?5["']?\s/.test(line) || /cx=["']?12["']?\s/.test(line)) && /cy=["']?12["']?/.test(line)) {
    // Dots must be r=2
    const radiusMatch = line.match(/\br=["']?([\d.]+)["']?/);
    if (radiusMatch && radiusMatch[1] !== "2") {
      return {
        ruleCode: "WRONG_SVG_GEOMETRY",
        message: `Brand icon dot has incorrect radius r=${radiusMatch[1]} — must be r=2`,
        fix: "Use <AfendaMark /> instead of inline SVG, or fix dots to: r=2 fill=currentColor",
      };
    }
  }

  return null;
}

// --- Rule docs --------------------------------------------------------------

const RULE_DOCS = {
  DIRECT_AFENDAMARK: {
    why: "AfendaMark is the raw SVG icon. All brand rendering should go through AfendaLogo for consistent proportional lock-up (1:2:0.5 ratio).",
    docs: "docs/ci-gates/brand-usage.md",
  },
  INLINE_BRAND_TEXT: {
    why: "Inline <span>AFENDA</span> fragments the brand — use AfendaLogo which enforces correct font, tracking, and proportional sizing.",
    docs: "docs/ci-gates/brand-usage.md",
  },
  INLINE_TAGLINE: {
    why: 'The tagline "Where numbers become canon" has specific typography (mono, uppercase, 0.2em tracking). AfendaLogo encapsulates this.',
    docs: "docs/ci-gates/brand-usage.md",
  },
  WRONG_SVG_GEOMETRY: {
    why: "The AfendaMark has locked geometry: dots r=2, ring r=2.5 stroke-width=1.5. Copy-paste drift breaks the visual identity.",
    docs: "docs/ci-gates/brand-usage.md",
  },
};

// --- Main scanner -----------------------------------------------------------

function shouldSkipFile(filePath) {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath));
}

const t0 = performance.now();
const violations = [];
let filesScanned = 0;

for (const dir of SCAN_DIRS) {
  for (const filePath of walkTs(dir)) {
    // Only scan .tsx files (brand rendering is JSX)
    if (!filePath.endsWith(".tsx")) continue;
    if (shouldSkipFile(filePath)) continue;

    filesScanned++;
    const rel = relative(ROOT, filePath);
    const fileName = filePath.split(/[/\\]/).pop();
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (hasExemptMarker(lines, i)) continue;

      const detectors = [
        () => detectDirectAfendaMark(line, fileName),
        () => detectInlineBrandText(line, fileName, filePath),
        () => detectInlineTagline(line, fileName),
        () => detectWrongSvgGeometry(line),
      ];

      for (const detect of detectors) {
        const result = detect();
        if (result) {
          violations.push({
            ...result,
            file: rel,
            line: i + 1,
          });
        }
      }
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

if (violations.length > 0) {
  reportViolations({
    gateName: GATE_NAME,
    violations,
    ruleDocs: RULE_DOCS,
    stats: { "Files scanned:": filesScanned },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: GATE_NAME,
    detail: `${filesScanned} .tsx files scanned in ${elapsed}s`,
  });
}
