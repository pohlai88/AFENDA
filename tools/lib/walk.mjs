/**
 * tools/lib/walk.mjs — Recursive directory walker for TypeScript source files.
 *
 * Skips build artifacts, caches and dependency directories.
 * Returns absolute paths to all .ts / .tsx / .mts files (excluding .d.ts).
 */

import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".turbo",
  "drizzle",
  ".next",
  ".vercel",
  "coverage",
  ".git",
]);

/**
 * Walk `dir` recursively and return absolute paths for all TS source files.
 *
 * @param {string} dir  — absolute path to start walking
 * @returns {string[]}  — absolute file paths
 */
export function walkTs(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (/\.(ts|tsx|mts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}
