#!/usr/bin/env node
/**
 * tools/gates/route-registry-sync.mjs
 *
 * CI gate: ensures every API route file is imported and registered in index.ts.
 * Validates scaffold.mjs step #12: "Register route in apps/api/src/index.ts"
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. ROUTE_FILE_UNREGISTERED — a .ts file in apps/api/src/routes/ exports
 *     a *Routes function but is not imported and registered in index.ts.
 *  2. ROUTE_IMPORT_ORPHAN — index.ts imports a route module that doesn't
 *     exist on disk (stale import).
 *  3. ROUTE_REGISTRATION_INCOMPLETE — route is imported but not registered
 *     with app.register().
 *  4. ROUTE_PREFIX_MISMATCH — route registered with wrong prefix (not "/v1").
 *
 * Scaffold reference: tools/scaffold.mjs step #12
 *
 * Usage:
 *   node tools/gates/route-registry-sync.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ROUTES_DIR = resolve(ROOT, "apps/api/src/routes");
const INDEX_FILE = resolve(ROOT, "apps/api/src/index.ts");

// ─── Rule Documentation ──────────────────────────────────────────────────────

const RULE_DOCS = {
  ROUTE_FILE_UNREGISTERED: {
    why: "Route files that are not registered in index.ts are dead code — the API will not expose those endpoints.",
    docs: "See apps/api/src/index.ts — add import and app.register() for the route module. Ref: tools/scaffold.mjs step #12.",
  },
  ROUTE_IMPORT_ORPHAN: {
    why: "Imports pointing to non-existent route files cause build failures and indicate stale refactoring.",
    docs: "Remove the import and app.register() from index.ts, or restore the route file.",
  },
  ROUTE_REGISTRATION_INCOMPLETE: {
    why: "Route is imported but not registered with app.register() — endpoints won't be exposed.",
    docs: "Add app.register() call after imports in apps/api/src/index.ts (under 'Domain routes' section).",
  },
  ROUTE_PREFIX_MISMATCH: {
    why: "All routes must use '/v1' prefix for API versioning consistency.",
    docs: "Change app.register() prefix to '/v1' in apps/api/src/index.ts.",
  },
};

/**
 * Generate inline diagnostic with scaffold checklist context.
 * Provides step-by-step fix instructions matching scaffold.mjs pattern.
 */
function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "ROUTE_FILE_UNREGISTERED":
      return [
        `📋 SCAFFOLD STEP #12 INCOMPLETE`,
        ``,
        `Add to apps/api/src/index.ts:`,
        ``,
        `  1. Import statement (with other route imports):`,
        `     import { ${ctx.exportName} } from "${ctx.importPath}";`,
        ``,
        `  2. Registration (under "── Domain routes ──" section):`,
        `     await app.register(${ctx.exportName}, { prefix: "/v1" });`,
        ``,
        `  3. Optional: Add route to startup log (apps/api/src/index.ts ~line 249)`,
        ``,
        `Ref: tools/scaffold.mjs line 192 (step #12)`,
      ].join("\n");
    case "ROUTE_IMPORT_ORPHAN":
      return [
        `📋 STALE IMPORT DETECTED`,
        ``,
        `The file "${ctx.importPath}" no longer exists but is still imported.`,
        ``,
        `Fix options:`,
        `  1. Remove import from apps/api/src/index.ts`,
        `  2. Remove app.register() call for ${ctx.exportName}`,
        `  3. Remove route from startup log (if present)`,
        ``,
        `Or restore the deleted file if removal was accidental.`,
      ].join("\n");
    case "ROUTE_REGISTRATION_INCOMPLETE":
      return [
        `📋 REGISTRATION MISSING`,
        ``,
        `Route "${ctx.exportName}" is imported but not registered.`,
        ``,
        `Add to apps/api/src/index.ts (under "── Domain routes ──"):`,
        `  await app.register(${ctx.exportName}, { prefix: "/v1" });`,
      ].join("\n");
    case "ROUTE_PREFIX_MISMATCH":
      return [
        `📋 WRONG PREFIX`,
        ``,
        `Route "${ctx.exportName}" registered with prefix "${ctx.actualPrefix}"`,
        `Expected: "/v1" (all routes must use v1 prefix)`,
        ``,
        `Fix in apps/api/src/index.ts:`,
        `  await app.register(${ctx.exportName}, { prefix: "/v1" });`,
      ].join("\n");
    default:
      return "(no suggestion available)";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract exported *Routes function names from route files.
 * Returns Map<relPath, exportName> e.g. "routes/kernel/evidence.ts" -> "evidenceRoutes"
 */
function extractRouteExports() {
  const exports = new Map();
  if (!existsSync(ROUTES_DIR)) return exports;

  const files = walkTs(ROUTES_DIR);

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const relPath = relative(ROOT, file).split(sep).join("/");

    // Match: export async function xxxRoutes(app: FastifyInstance)
    const m = content.match(/export\s+async\s+function\s+(\w+Routes)\s*\(/);
    if (m) {
      exports.set(relPath, m[1]);
    }
  }
  return exports;
}

/**
 * Extract route imports and register calls from index.ts.
 * Returns { 
 *   imports: Map<importPath, exportName>,
 *   registered: Map<exportName, prefix>,
 *   registeredSet: Set<exportName>
 * }
 */
function extractIndexRegistrations() {
  const result = { 
    imports: new Map(), 
    registered: new Map(),
    registeredSet: new Set() 
  };
  if (!existsSync(INDEX_FILE)) return result;

  const content = readFileSync(INDEX_FILE, "utf-8");

  // Match: import { evidenceRoutes } from "./routes/kernel/evidence.js";
  const importRe = /import\s*\{\s*(\w+)\s*\}\s*from\s*["'](\.\/routes\/[^"']+)["']/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    result.imports.set(m[2].replace(/\.js$/, ".ts"), m[1]);
  }

  // Match: await app.register(evidenceRoutes, { prefix: "/v1" });
  // Capture both exportName and prefix for validation
  const registerRe = /app\.register\s*\(\s*(\w+)\s*,\s*\{\s*prefix:\s*["']([^"']+)["']\s*\}\)/g;
  while ((m = registerRe.exec(content)) !== null) {
    result.registered.set(m[1], m[2]); // exportName -> prefix
    result.registeredSet.add(m[1]);
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];

const routeExports = extractRouteExports();
const { imports, registered, registeredSet } = extractIndexRegistrations();

// Resolve import path to absolute file path.
// "./routes/kernel/evidence.js" -> .../apps/api/src/routes/kernel/evidence.ts
function toAbsPath(importPath) {
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const full = resolve(ROOT, "apps/api/src", importPath).replace(/\.js$/, ".ts");
    return full;
  }
  return null;
}

// ── Rule 1: ROUTE_FILE_UNREGISTERED ───────────────────────────────────────────
// Route exists on disk but is neither imported nor registered
for (const [relPath, exportName] of routeExports) {
  if (!registeredSet.has(exportName)) {
    const importPathForFix = "./" + relPath.replace("apps/api/src/", "").replace(".ts", ".js");
    violations.push({
      ruleCode: "ROUTE_FILE_UNREGISTERED",
      file: relPath,
      line: null,
      message: `Route file exports "${exportName}" but it is not registered in index.ts`,
      meta: {
        exportName,
        filePath: relPath,
        scaffoldStep: "#12",
      },
      fix: suggestFix("ROUTE_FILE_UNREGISTERED", {
        exportName,
        importPath: importPathForFix,
      }),
    });
  }
}

// ── Rule 2: ROUTE_IMPORT_ORPHAN ──────────────────────────────────────────────
// Import references a file that no longer exists
for (const [importPath, exportName] of imports) {
  const absPath = toAbsPath(importPath);
  if (absPath && !existsSync(absPath)) {
    violations.push({
      ruleCode: "ROUTE_IMPORT_ORPHAN",
      file: "apps/api/src/index.ts",
      line: null,
      message: `Import "${importPath}" references a non-existent file`,
      meta: {
        importPath,
        exportName,
      },
      fix: suggestFix("ROUTE_IMPORT_ORPHAN", { importPath, exportName }),
    });
  }
}

// ── Rule 3: ROUTE_REGISTRATION_INCOMPLETE ────────────────────────────────────
// Route is imported but not registered with app.register()
for (const [importPath, exportName] of imports) {
  if (!registeredSet.has(exportName)) {
    violations.push({
      ruleCode: "ROUTE_REGISTRATION_INCOMPLETE",
      file: "apps/api/src/index.ts",
      line: null,
      message: `Route "${exportName}" is imported but not registered with app.register()`,
      meta: {
        exportName,
        importPath,
      },
      fix: suggestFix("ROUTE_REGISTRATION_INCOMPLETE", { exportName }),
    });
  }
}

// ── Rule 4: ROUTE_PREFIX_MISMATCH ────────────────────────────────────────────
// Route is registered but with wrong prefix (not "/v1")
for (const [exportName, prefix] of registered) {
  if (prefix !== "/v1") {
    violations.push({
      ruleCode: "ROUTE_PREFIX_MISMATCH",
      file: "apps/api/src/index.ts",
      line: null,
      message: `Route "${exportName}" registered with prefix "${prefix}" (expected "/v1")`,
      meta: {
        exportName,
        actualPrefix: prefix,
        expectedPrefix: "/v1",
      },
      fix: suggestFix("ROUTE_PREFIX_MISMATCH", { exportName, actualPrefix: prefix }),
    });
  }
}

const allViolations = violations;
const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ───────────────────────────────────────────────────────────────────

if (allViolations.length > 0) {
  reportViolations({
    gateName: "ROUTE REGISTRY SYNC",
    violations: allViolations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Route files:": routeExports.size,
      "Imported:": imports.size,
      "Registered:": registeredSet.size,
      "Expected:": routeExports.size,
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "route-registry-sync check",
    detail: `${routeExports.size} route files · ${registeredSet.size} registered · all prefixed with /v1 (${elapsed}s)`,
  });
}
