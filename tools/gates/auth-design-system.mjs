#!/usr/bin/env node
/**
 * tools/gates/auth-design-system.mjs
 *
 * Lightweight gate for AFENDA auth UI design-system consistency.
 *
 * Rules
 * - AUTH_NO_LITERAL_COLORS: no raw color literals in auth UI TSX files.
 * - AUTH_CARD_SURFACE_REQUIRED: Card-based auth panels must use shared surface style.
 *
 * Usage:
 *   node tools/gates/auth-design-system.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { reportSuccess, reportViolations } from "../lib/reporter.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const AUTH_DIR = resolve(ROOT, "apps/web/src/app/auth");
const MATRIX_DOC = resolve(ROOT, "docs/auth/auth-ui-layer-matrix.md");

const RULE_DOCS = {
  AUTH_NO_LITERAL_COLORS: {
    why: "Auth UI must use AFENDA semantic tokens and layer surfaces instead of ad-hoc colors.",
    docs: "See docs/auth/auth-ui-layer-matrix.md and packages/ui/src/styles/_tokens-dark.css.",
  },
  AUTH_CARD_SURFACE_REQUIRED: {
    why: "Card-based auth panels must render on the shared L2 auth surface contract.",
    docs: "Use authCardSurfaceStyle from apps/web/src/app/auth/_components/surface-styles.ts.",
  },
};

function walkTsxFiles(dir) {
  const out = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTsxFiles(full));
      continue;
    }

    if (extname(full) === ".tsx") {
      out.push(full);
    }
  }

  return out;
}

function getLineNumber(content, idx) {
  if (idx < 0) return null;
  const prefix = content.slice(0, idx);
  return prefix.split(/\r?\n/).length;
}

function main() {
  const t0 = performance.now();
  const violations = [];

  if (!existsSync(AUTH_DIR)) {
    console.error(`Missing auth directory: ${AUTH_DIR}`);
    process.exit(1);
  }

  if (!existsSync(MATRIX_DOC)) {
    console.error("Missing matrix doc: docs/auth/auth-ui-layer-matrix.md");
    process.exit(1);
  }

  const files = walkTsxFiles(AUTH_DIR);

  // Matches raw color literals. Intentionally allows var()/tokenized utility usage.
  const rawColorRe = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/g;

  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = readFileSync(file, "utf-8");

    // Rule 1: no raw color literals in auth TSX.
    let match;
    while ((match = rawColorRe.exec(content)) !== null) {
      const token = match[0];

      // Allow hsl(var(--...)) pattern when present.
      if (
        (token === "hsl(" || token === "hsla(") &&
        content.slice(match.index, match.index + 24).includes("var(--")
      ) {
        continue;
      }

      violations.push({
        ruleCode: "AUTH_NO_LITERAL_COLORS",
        file: rel,
        line: getLineNumber(content, match.index),
        message: `Raw color literal found: ${token}`,
        fix: "Replace literal color with AFENDA token or shared surface style from auth/_components/surface-styles.ts.",
      });
      break;
    }

    // Rule 2: card-based auth components must use shared surface style.
    if (rel.includes("apps/web/src/app/auth/_components/") && content.includes("<Card")) {
      const exempt = content.includes("auth-surface-exempt");
      const hasSharedStyle = content.includes("authCardSurfaceStyle");

      if (!exempt && !hasSharedStyle) {
        violations.push({
          ruleCode: "AUTH_CARD_SURFACE_REQUIRED",
          file: rel,
          line: getLineNumber(content, content.indexOf("<Card")),
          message: "Card detected without shared auth surface style.",
          fix: "Import and apply authCardSurfaceStyle, or add // auth-surface-exempt with rationale.",
        });
      }
    }
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  const stats = {
    "Auth TSX files:": files.length,
    "Matrix doc:": existsSync(MATRIX_DOC) ? "present" : "missing",
  };

  if (violations.length > 0) {
    reportViolations({
      gateName: "AUTH DESIGN SYSTEM",
      violations,
      ruleDocs: RULE_DOCS,
      stats,
      elapsed,
    });
    process.exit(1);
  }

  reportSuccess({
    gateName: "auth-design-system",
    detail: `scanned ${files.length} auth TSX files`,
  });
}

main();
