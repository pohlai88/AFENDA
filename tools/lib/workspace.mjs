/**
 * tools/lib/workspace.mjs — pnpm-workspace.yaml reader + package.json discovery.
 *
 * Provides utilities for loading the workspace config and finding every
 * package.json that belongs to the monorepo.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * Load and parse pnpm-workspace.yaml from the monorepo root.
 *
 * @param {string} root  — absolute path to the monorepo root
 * @returns {{ packages?: string[], catalog?: Record<string, string>, [k: string]: unknown }}
 */
export function loadWorkspace(root) {
  const wsPath = join(root, "pnpm-workspace.yaml");
  if (!existsSync(wsPath)) {
    throw new Error(`pnpm-workspace.yaml not found at ${wsPath}`);
  }
  return parseYaml(readFileSync(wsPath, "utf-8"));
}

/**
 * Discover all package.json files matching the given workspace glob patterns.
 * Also includes the root package.json if it exists.
 *
 * @param {string}   root      — absolute path to the monorepo root
 * @param {string[]} patterns  — e.g. ["packages/*", "apps/*"]
 * @returns {string[]}  — absolute paths to package.json files
 */
export function discoverPackageJsons(root, patterns) {
  const pkgJsons = [];

  const rootPkg = join(root, "package.json");
  if (existsSync(rootPkg)) pkgJsons.push(rootPkg);

  for (const pattern of patterns) {
    const base = pattern.replace("/*", "");
    const dir = join(root, base);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = join(dir, entry.name, "package.json");
      if (existsSync(p)) pkgJsons.push(p);
    }
  }

  return pkgJsons;
}

/**
 * Find the 1-based line number of a dependency key inside a raw package.json string.
 *
 * @param {string} pkgJsonContent  — raw file content
 * @param {string} field           — e.g. "dependencies" or "devDependencies"
 * @param {string} depName         — the dependency name to locate
 * @returns {number | null}
 */
export function findDepLine(pkgJsonContent, field, depName) {
  const lines = pkgJsonContent.split("\n");
  let inField = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(`"${field}"`)) {
      inField = true;
      braceDepth = 0;
    }

    if (inField) {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (line.includes(`"${depName}"`)) {
        return i + 1; // 1-based
      }
      if (braceDepth <= 0 && line.includes("}")) {
        inField = false;
      }
    }
  }
  return null;
}
