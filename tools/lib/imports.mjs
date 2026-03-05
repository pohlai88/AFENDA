/**
 * tools/lib/imports.mjs — Import-statement extraction + bare-package normalizer.
 *
 * Parses TypeScript source line-by-line to extract every import/export/require
 * specifier together with the 1-based line number and the raw statement text.
 */

/**
 * Extract all import/require specifiers WITH line numbers from TypeScript source.
 *
 * @param {string} content  — file source code
 * @returns {{ specifier: string, line: number, statement: string }[]}
 */
export function extractImports(content) {
  const out = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const lineNo = i + 1;

    // static: import/export ... from "spec"
    for (const m of ln.matchAll(/(?:import|export)\s.*?\sfrom\s+["']([^"']+)["']/g)) {
      out.push({ specifier: m[1], line: lineNo, statement: ln.trim() });
    }
    // side-effect: import "spec"
    for (const m of ln.matchAll(/^import\s+["']([^"']+)["']\s*;/g)) {
      out.push({ specifier: m[1], line: lineNo, statement: ln.trim() });
    }
    // dynamic: import("spec")
    for (const m of ln.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      out.push({ specifier: m[1], line: lineNo, statement: ln.trim() });
    }
    // require("spec")
    for (const m of ln.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      out.push({ specifier: m[1], line: lineNo, statement: ln.trim() });
    }
  }

  return out;
}

/**
 * Normalize an import specifier to a bare package name.
 *
 *   "@afenda/db/foo"  → "@afenda/db"
 *   "drizzle-orm/pg"  → "drizzle-orm"
 *
 * @param {string} spec
 * @returns {string}
 */
export function barePackage(spec) {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.slice(0, 2).join("/");
  }
  return spec.split("/")[0];
}
