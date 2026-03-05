#!/usr/bin/env node
/**
 * tools/gates/catalog.mjs
 *
 * CI gate: ensures dependency version hygiene across the monorepo.
 *
 * Rules enforced:
 *   1. DUPLICATE_NOT_IN_CATALOG — if ≥2 packages install the same non-workspace
 *      dependency, every occurrence MUST use "catalog:" as the version.
 *   2. VERSION_MISMATCH — if a non-workspace dependency appears in ≥2 packages
 *      with different hardcoded version strings, flag it.
 *   3. CATALOG_MISSING — if a package uses "catalog:" but the dep is not defined
 *      in pnpm-workspace.yaml's catalog section.
 *
 * Usage:
 *   node tools/gates/catalog.mjs         # exit 0 if clean, 1 if violations
 */

import { readFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkspace, discoverPackageJsons, findDepLine } from "../lib/workspace.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const THRESHOLD = 2; // ≥2 packages sharing a dep → must be in catalog

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  DUPLICATE_NOT_IN_CATALOG: {
    why: "When ≥2 packages share a dependency, hardcoding versions leads to silent drift. The catalog is the single source of truth for version alignment.",
    docs: "See pnpm docs: https://pnpm.io/catalogs",
  },
  VERSION_MISMATCH: {
    why: "Different versions of the same package across the monorepo causes runtime bugs and bloated node_modules. Align via catalog.",
    docs: "See pnpm docs: https://pnpm.io/catalogs",
  },
  CATALOG_MISSING: {
    why: 'A package.json references "catalog:" but the dependency is not defined in pnpm-workspace.yaml. pnpm install will fail.',
    docs: "Add the dependency + version to the catalog: section in pnpm-workspace.yaml",
  },
};

/** Generate a concrete fix suggestion per rule. */
function suggestFix(ruleCode, { depName, version, catalogVersion, usages } = {}) {
  switch (ruleCode) {
    case "DUPLICATE_NOT_IN_CATALOG": {
      const locations = usages
        .filter((u) => u.version !== "catalog:")
        .map((u) => `${u.pkg} (${u.field})`)
        .join(", ");
      if (catalogVersion) {
        return `Replace "${version}" with "catalog:" in the affected package.json files: ${locations}. The catalog already defines ${depName}@${catalogVersion}.`;
      }
      return `1) Add '${depName}: "${version}"' to the catalog: section in pnpm-workspace.yaml.  2) Replace the version in all package.json files with "catalog:". Affected: ${locations}`;
    }

    case "VERSION_MISMATCH": {
      const pairs = usages
        .filter((u) => u.version !== "catalog:")
        .map((u) => `${u.pkg}=${u.version}`)
        .join(", ");
      return `Pick one version, add it to catalog:, then change all occurrences to "catalog:". Current: ${pairs}`;
    }

    case "CATALOG_MISSING":
      return `Add '${depName}: "<version>"' to the catalog: section in pnpm-workspace.yaml, then run pnpm install.`;

    default:
      return "(no suggestion available)";
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();

let ws;
try {
  ws = loadWorkspace(ROOT);
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  process.exit(2);
}

const catalogEntries = ws.catalog ?? {};
const catalogNames = new Set(Object.keys(catalogEntries));
const patterns = ws.packages ?? [];
const pkgJsonPaths = discoverPackageJsons(ROOT, patterns);

// depName → [{ pkg, version, field, relPath, line }]
const depMap = new Map();

for (const pkgPath of pkgJsonPaths) {
  const raw = readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(raw);
  const pkgName = pkg.name ?? relative(ROOT, pkgPath).split(sep).join("/");
  const relPath = relative(ROOT, pkgPath).split(sep).join("/");

  for (const field of ["dependencies", "devDependencies"]) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === "string" && version.startsWith("workspace:")) continue;

      const line = findDepLine(raw, field, name);

      if (!depMap.has(name)) depMap.set(name, []);
      depMap.get(name).push({ pkg: pkgName, version, field, relPath, line });
    }
  }
}

const violations = [];

for (const [depName, usages] of depMap) {
  const catalogVersion = catalogEntries[depName] ?? null;

  // ── Rule 1: ≥ THRESHOLD packages → must all use "catalog:" ──────────────
  if (usages.length >= THRESHOLD) {
    const nonCatalog = usages.filter((u) => u.version !== "catalog:");
    if (nonCatalog.length > 0) {
      for (const u of nonCatalog) {
        violations.push({
          ruleCode: "DUPLICATE_NOT_IN_CATALOG",
          dep: depName,
          pkg: u.pkg,
          relPath: u.relPath,
          line: u.line,
          field: u.field,
          version: u.version,
          message: `"${depName}" is used by ${usages.length} packages — all must use "catalog:" (found "${u.version}" in ${u.field})`,
          fix: suggestFix("DUPLICATE_NOT_IN_CATALOG", {
            depName,
            version: u.version,
            catalogVersion,
            usages,
          }),
        });
      }
    }
  }

  // ── Rule 2: version mismatch across packages ────────────────────────────
  const hardcoded = usages.filter((u) => u.version !== "catalog:");
  if (hardcoded.length >= 2) {
    const versions = new Set(hardcoded.map((u) => u.version));
    if (versions.size > 1) {
      for (const u of hardcoded) {
        violations.push({
          ruleCode: "VERSION_MISMATCH",
          dep: depName,
          pkg: u.pkg,
          relPath: u.relPath,
          line: u.line,
          field: u.field,
          version: u.version,
          message: `"${depName}" has conflicting versions across packages: ${[...versions].join(" vs ")}`,
          fix: suggestFix("VERSION_MISMATCH", { depName, usages }),
        });
      }
    }
  }

  // ── Rule 3: "catalog:" used but dep not in catalog section ──────────────
  const catalogRefs = usages.filter((u) => u.version === "catalog:");
  if (catalogRefs.length > 0 && !catalogNames.has(depName)) {
    for (const u of catalogRefs) {
      violations.push({
        ruleCode: "CATALOG_MISSING",
        dep: depName,
        pkg: u.pkg,
        relPath: u.relPath,
        line: u.line,
        field: u.field,
        version: "catalog:",
        message: `"${depName}" referenced as "catalog:" but not defined in pnpm-workspace.yaml catalog section`,
        fix: suggestFix("CATALOG_MISSING", { depName }),
      });
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  reportSuccess({
    gateName: "catalog check",
    detail: `${depMap.size} unique deps · ${pkgJsonPaths.length} packages scanned · ${catalogNames.size} catalog entries · ${elapsed}s`,
  });
  process.exit(0);
}

reportViolations({
  gateName: "CATALOG CHECK",
  violations,
  ruleDocs: RULE_DOCS,
  stats: {
    "Packages scanned:": pkgJsonPaths.length,
    "Unique deps:": depMap.size,
    "Catalog entries:": catalogNames.size,
  },
  elapsed,
});

process.exit(1);
