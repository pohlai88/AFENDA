#!/usr/bin/env node
/**
 * tools/gates/module-boundaries.mjs
 *
 * CI gate: enforces pillar and module dependency boundaries per ADR-0005.
 *
 * Usage:
 *   node tools/gates/module-boundaries.mjs   # exit 0 if clean, 1 if violations
 *
 * ─── Pillar Law ─────────────────────────────────────────────────────────────
 *
 *  shared:  imports nobody (pillar-level)
 *  kernel:  may import shared
 *  erp:     may import shared + kernel
 *  comm:    may import shared + kernel (NEVER erp)
 *
 * ─── Module Dependency Law ──────────────────────────────────────────────────
 *
 *  Each module declares its dependsOn in its manifest.
 *  An ERP module may only import another ERP module if explicitly declared.
 *
 * ─── Enforcement ────────────────────────────────────────────────────────────
 *
 *  Hard:    pillar boundaries, module dependency graph
 *  Warning: submodule boundaries, orphan directories
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { extractImports } from "../lib/imports.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const MODULES_DIR = resolve(ROOT, "tools/modules");

// Pillar dependency matrix: what each pillar is allowed to import
const PILLAR_DEPS = {
  shared: [],
  kernel: ["shared"],
  erp: ["shared", "kernel"],
  comm: ["shared", "kernel"],
};

// Packages where pillar boundaries apply
const PILLAR_PACKAGES = [
  "packages/contracts/src",
  "packages/db/src/schema",
  "packages/core/src",
  "apps/api/src/routes",
  "apps/worker/src/jobs",
];

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  PILLAR_BOUNDARY: {
    why: "Pillar law prevents architectural coupling between kernel, ERP, and comm surfaces.",
    docs: "See ADR-0005 §3.2 — Pillar Law; §4.1 — Pillar dependency rules",
  },
  MODULE_DEPENDENCY: {
    why: "Module dependency law prevents uncontrolled coupling between business domains.",
    docs: "See ADR-0005 §4.3 — ERP module dependency rules; §4.4 — CI enforcement scope",
  },
  ORPHAN_FILE: {
    why: "Files outside the pillar/module structure are unowned and should be migrated.",
    docs: "See ADR-0005 §8 — Migration Strategy",
  },
};

// ─── Load manifests ──────────────────────────────────────────────────────────

/** @type {Map<string, { code: string, pillar: string, dependsOn: string[], currentPaths: string[] }>} */
const manifests = new Map();

if (existsSync(MODULES_DIR)) {
  const manifestFiles = readdirSync(MODULES_DIR).filter((f) => f.endsWith(".manifest.mjs"));
  for (const file of manifestFiles) {
    const absPath = resolve(MODULES_DIR, file);
    // Dynamic import expects a file URL on Windows
    const mod = await import(pathToFileURL(absPath).href);
    const m = mod.moduleManifest;
    if (m && m.code) {
      manifests.set(m.code, m);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect which pillar a file belongs to based on its relative path.
 * Works for both current (pre-migration) and target (post-migration) layouts.
 *
 * @param {string} relPath — relative path from ROOT, forward-slashed
 * @returns {{ pillar: string|null, module: string|null }}
 */
function classifyFile(relPath) {
  // Match against known pillar package prefixes
  for (const pkgPrefix of PILLAR_PACKAGES) {
    if (!relPath.startsWith(pkgPrefix + "/")) continue;
    const inner = relPath.slice(pkgPrefix.length + 1); // path after src/ or schema/
    const firstSegment = inner.split("/")[0];

    // Post-migration layout: kernel/, erp/, comm/, shared/
    if (firstSegment in PILLAR_DEPS) {
      const pillar = firstSegment;
      // Extract module from second segment if applicable
      const parts = inner.split("/");
      if (pillar !== "shared" && parts.length >= 2) {
        const moduleName = parts[1].replace(/\.(ts|js|tsx|jsx|mjs)$/, ""); // e.g., "identity", "finance"
        return { pillar, module: `${pillar}.${moduleName}` };
      }
      return { pillar, module: null };
    }

    // Pre-migration layout: map current directories to pillars
    // Check all manifests' currentPaths to find which module owns this file
    for (const [code, manifest] of manifests) {
      for (const pattern of manifest.currentPaths) {
        if (matchGlob(relPath, pattern)) {
          return { pillar: manifest.pillar, module: code };
        }
      }
    }

    // Not yet classified — could be infra/ or shared/ pre-migration
    // infra/ is infrastructure, not pillar-governed
    if (firstSegment === "infra") {
      return { pillar: null, module: null }; // infra is exempt from pillar law
    }

    return { pillar: null, module: null };
  }

  return { pillar: null, module: null };
}

/**
 * Simple glob matcher supporting ** and * patterns.
 * @param {string} path — forward-slashed relative path
 * @param {string} pattern — glob pattern (e.g., "packages/contracts/src/iam/**")
 * @returns {boolean}
 */
function matchGlob(path, pattern) {
  // Convert glob to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex chars except * and ?
    .replace(/\*\*/g, "§DOUBLESTAR§")
    .replace(/\*/g, "[^/]*")
    .replace(/§DOUBLESTAR§/g, ".*")
    .replace(/\?/g, "[^/]");
  const re = new RegExp(`^${escaped}$`);
  return re.test(path);
}

/**
 * Detect which pillar a relative import target belongs to, by resolving
 * the relative path from the importing file.
 *
 * @param {string} importerRelPath — relative path of the importing file
 * @param {string} specifier — the import specifier (relative path)
 * @returns {{ pillar: string|null, module: string|null }}
 */
function classifyRelativeImport(importerRelPath, specifier) {
  const importerDir = dirname(importerRelPath);
  // Resolve the relative specifier against the importer's directory
  const parts = importerDir.split("/");
  const specParts = specifier.split("/");

  const resolved = [...parts];
  for (const seg of specParts) {
    if (seg === "..") {
      resolved.pop();
    } else if (seg !== ".") {
      resolved.push(seg);
    }
  }
  const resolvedPath = resolved.join("/");
  return classifyFile(resolvedPath);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
const warnings = [];
let totalFiles = 0;
let totalImports = 0;

// Build module dependency lookup for fast checks
// For a module like "erp.finance", dependsOn: ["kernel"] means it can import
// anything in the kernel pillar, plus shared.
/** @type {Map<string, Set<string>>} module code → set of allowed module codes */
const allowedDeps = new Map();

for (const [code, manifest] of manifests) {
  const allowed = new Set();
  for (const dep of manifest.dependsOn) {
    // A dependency like "kernel" means all kernel.* modules are allowed
    if (!dep.includes(".")) {
      // Pillar-level dependency: allow all modules in that pillar
      for (const [otherCode, otherManifest] of manifests) {
        if (otherManifest.pillar === dep) {
          allowed.add(otherCode);
        }
      }
    } else {
      // Specific module dependency
      allowed.add(dep);
    }
  }
  allowedDeps.set(code, allowed);
}

// Scan pillar-relevant packages
for (const pkgPrefix of PILLAR_PACKAGES) {
  const absDir = resolve(ROOT, pkgPrefix);
  if (!existsSync(absDir)) continue;

  const files = walkTs(absDir);
  totalFiles += files.length;

  for (const file of files) {
    const relFile = relative(ROOT, file).split(sep).join("/");
    const source = classifyFile(relFile);

    // Skip files we can't classify (infra, unowned)
    if (!source.pillar) continue;

    const content = readFileSync(file, "utf-8");
    const imports = extractImports(content);
    totalImports += imports.length;

    for (const { specifier: raw, line, statement } of imports) {
      // Only check relative imports for pillar/module boundary crossing
      // @afenda/* cross-package imports are handled by the existing boundaries.mjs gate
      if (!raw.startsWith(".") && !raw.startsWith("/")) continue;

      const target = classifyRelativeImport(relFile, raw);
      if (!target.pillar) continue; // target is outside pillar scope (e.g., infra)

      // ── Pillar boundary check ──────────────────────────────────────
      const allowedPillars = PILLAR_DEPS[source.pillar] ?? [];
      if (
        target.pillar !== source.pillar &&
        !allowedPillars.includes(target.pillar)
      ) {
        violations.push({
          ruleCode: "PILLAR_BOUNDARY",
          file: relFile,
          line,
          statement,
          import: raw,
          message: `${source.pillar}/ cannot import from ${target.pillar}/. Allowed pillars: [${allowedPillars.join(", ") || "none"}]`,
          fix: pillarFix(source.pillar, target.pillar),
        });
      }

      // ── Module dependency check ────────────────────────────────────
      if (
        source.module &&
        target.module &&
        source.module !== target.module &&
        source.pillar === "erp" &&
        target.pillar === "erp"
      ) {
        const allowed = allowedDeps.get(source.module);
        if (allowed && !allowed.has(target.module)) {
          violations.push({
            ruleCode: "MODULE_DEPENDENCY",
            file: relFile,
            line,
            statement,
            import: raw,
            message: `Module ${source.module} cannot import from ${target.module}. Not declared in dependsOn.`,
            fix: `Either add "${target.module}" to dependsOn in ${source.module.replace(".", "/")}.manifest.mjs, or refactor to remove the dependency.`,
          });
        }
      }
    }
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// Phase 6: enforced mode — pillar boundary violations fail CI.
const WARNING_MODE = false;

if (violations.length > 0) {
  if (WARNING_MODE) {
    // Emit warnings but exit 0
    reportViolations({
      gateName: "MODULE BOUNDARIES (warning mode — not blocking CI)",
      violations,
      ruleDocs: RULE_DOCS,
      stats: {
        "Files scanned:": totalFiles,
        "Imports checked:": totalImports,
        "Manifests loaded:": manifests.size,
        "Mode:": "WARNING (exit 0)",
      },
      elapsed,
    });
    // Override exit: do NOT fail CI in warning mode
    process.exitCode = 0;
  } else {
    reportViolations({
      gateName: "MODULE BOUNDARIES",
      violations,
      ruleDocs: RULE_DOCS,
      stats: {
        "Files scanned:": totalFiles,
        "Imports checked:": totalImports,
        "Manifests loaded:": manifests.size,
      },
      elapsed,
    });
    process.exit(1);
  }
} else {
  reportSuccess({
    gateName: "module-boundaries",
    detail: `${totalFiles} files, ${totalImports} imports, ${manifests.size} manifests (${elapsed}s)`,
  });
}

// ─── Fix suggestions ────────────────────────────────────────────────────────

function pillarFix(sourcePillar, targetPillar) {
  if (sourcePillar === "comm" && targetPillar === "erp") {
    return "comm/ must not import erp/ directly. Use kernel-mediated events (outbox envelopes, entity references, notification DTOs). See ADR-0005 §3.7.";
  }
  if (sourcePillar === "kernel" && (targetPillar === "erp" || targetPillar === "comm")) {
    return `kernel/ must not import ${targetPillar}/. Kernel provides primitives consumed by others, never the reverse.`;
  }
  if (sourcePillar === "shared") {
    return `shared/ must not import any pillar. It contains only universal, context-free primitives.`;
  }
  return `Move the needed code to a shared location or restructure imports to respect pillar boundaries.`;
}
