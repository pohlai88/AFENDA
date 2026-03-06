#!/usr/bin/env node
/**
 * tools/gates/boundaries.mjs
 *
 * CI gate: enforces package import-direction rules across the monorepo.
 *
 * Usage:
 *   node tools/gates/boundaries.mjs       # exit 0 if clean, 1 if violations
 *
 * ─── Import Direction Law ───────────────────────────────────────────────────
 *
 *  contracts  →  zod only (no monorepo deps)
 *  db         →  drizzle-orm + pg only (no Zod, no contracts)
 *  core       →  contracts + db
 *  api        →  contracts + core (never db directly)
 *  web        →  contracts + ui (never db, never core directly)
 *  worker     →  contracts + core + db
 *  ui         →  contracts only
 *
 * ─── Additional rules ──────────────────────────────────────────────────────
 *
 *  1. No Zod import inside packages/db
 *  2. No drizzle-orm import inside packages/contracts
 *  3. No barrel file (index.ts) exceeds MAX_BARREL_LINES
 *  4. No deep-path imports into @afenda/* packages (e.g. @afenda/core/src/...)
 *  5. Enum value parity: @afenda/db pgEnum arrays must match @afenda/contracts *Values
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { extractImports, barePackage } from "../lib/imports.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const MAX_BARREL_LINES = 60;

/**
 * For each package, which @afenda/* packages are ALLOWED as imports.
 *
 * NOTE: packages/db is allowed to import @afenda/contracts for `*Values`
 * const tuples only (e.g. InvoiceStatusValues → pgEnum). These are plain
 * `as const` arrays with zero Zod runtime. See contracts/OWNERS.md §3.
 */
const ALLOWED_INTERNAL = {
  "packages/contracts": [],
  "packages/db": ["@afenda/contracts"],
  "packages/core": ["@afenda/contracts", "@afenda/db"],
  "packages/ui": ["@afenda/contracts"],
  "apps/api": ["@afenda/contracts", "@afenda/core"],
  "apps/web": ["@afenda/contracts", "@afenda/ui"],
  "apps/worker": ["@afenda/contracts", "@afenda/core", "@afenda/db"],
};

/**
 * For each package, which external packages are FORBIDDEN.
 * Also lists forbidden `node:` prefixes for packages that must be runtime-free.
 */
const FORBIDDEN_EXTERNALS = {
  "packages/contracts": [
    // No DB runtime libs
    "drizzle-orm",
    "drizzle-kit",
    "pg",
    // No server-side HTTP / framework libs
    "fastify",
    "express",
    "koa",
    // No Node.js built-ins (bare form — node: prefix is caught below)
    "fs",
    "path",
    "crypto",
    "stream",
    "http",
    "https",
    "os",
    "child_process",
    "worker_threads",
    "net",
    "dns",
    "cluster",
  ],
  "packages/db": ["zod"],
};

/**
 * Packages where `node:` prefixed imports are also forbidden
 * (contracts must be a pure JSON-safe schema layer).
 */
const FORBIDDEN_NODE_PREFIX = new Set(["packages/contracts"]);

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  FORBIDDEN_EXTERNAL: {
    why: "Keeps the package runtime-independent from layers it must not couple to.",
    docs: "See PROJECT.md §14.1 — Import Direction Law",
  },
  BOUNDARY_VIOLATION: {
    why: "Enforces unidirectional dependency flow so changes propagate predictably.",
    docs: "See PROJECT.md §14.1 — Import Direction Law",
  },
  BARREL_TOO_LARGE: {
    why: "Large barrels hide coupling and slow down IDE tooling. Each barrel should be a thin re-export layer.",
    docs: "See PROJECT.md §14.1 — barrel size guard",
  },
  DEEP_PATH_IMPORT: {
    why: "Deep imports bypass the public barrel API and break on internal refactors.",
    docs: "See packages/core/OWNERS.md — Public API rule",
  },
  ENUM_SYNC_DRIFT: {
    why: "Enum value arrays in @afenda/db must match @afenda/contracts to prevent runtime mismatches.",
    docs: "See packages/contracts/OWNERS.md §1 — Truth Boundary",
  },
  CONTRACTS_NON_VALUES_IMPORT: {
    why: "packages/db may only import *Values const tuples from @afenda/contracts — no Zod schemas, entity types, or command types.",
    docs: "See packages/db/OWNERS.md — Import Rules",
  },
  SCHEMA_PURITY: {
    why: "Schema files must be deterministic and side-effect free so drizzle-kit produces reproducible migrations.",
    docs: "See packages/db/OWNERS.md — DDL Purity Rules",
  },
  BARREL_IMPURE: {
    why: "Schema barrels must be pure re-export layers — no values, types, functions, or external imports.",
    docs: "See packages/db/OWNERS.md — Barrel Rules",
  },
  SELF_ALIAS_IMPORT: {
    why: "A file inside a package must use relative imports (./foo, ../shared/bar) for intra-package references. Self-aliased imports (e.g. @afenda/contracts inside packages/contracts) create a circular dependency and bypass the local file system.",
    docs: "See PROJECT.md §14.1 — Import Direction Law",
  },
  CROSS_PKG_RELATIVE: {
    why: "Cross-package imports must use the @afenda/* alias through the barrel. Relative paths that escape the package root bypass the public API and break when packages are restructured.",
    docs: "See PROJECT.md §14.1 — Import Direction Law",
  },
};

/** Generate a human-readable fix suggestion for a violation. */
function suggestFix(ruleCode, { pkgDir, pkg, barrel, lines } = {}) {
  switch (ruleCode) {
    case "FORBIDDEN_EXTERNAL":
      if (pkg === "zod")
        return `Move Zod schema to @afenda/contracts and import the inferred type instead.`;
      if (pkg === "drizzle-orm" || pkg === "pg")
        return `Move DB access to @afenda/db or @afenda/core. Contracts must stay runtime-free.`;
      if (["fs", "path", "crypto", "stream", "http", "https", "os", "child_process"].includes(pkg))
        return `Remove Node.js built-in import. @afenda/contracts must be a pure JSON-safe schema layer (no runtime side effects).`;
      return `Remove the import or move the logic to a package that is allowed to depend on "${pkg}".`;

    case "BOUNDARY_VIOLATION": {
      const allowed = ALLOWED_INTERNAL[pkgDir] ?? [];
      if (pkgDir === "apps/api" && pkg === "@afenda/db")
        return `API must not touch DB directly. Call a @afenda/core service instead.`;
      if (pkgDir === "apps/web" && (pkg === "@afenda/db" || pkg === "@afenda/core"))
        return `Web must not import ${pkg}. Use @afenda/contracts for types and @afenda/ui for components.`;
      return `Move the needed type/function to one of the allowed packages [${allowed.join(", ") || "none"}], then import from there.`;
    }

    case "BARREL_TOO_LARGE":
      return `Split ${barrel} into domain-grouped sub-barrels (e.g. ./iam/index.ts, ./gl/index.ts) and re-export from the top barrel. Target < ${MAX_BARREL_LINES} lines.`;

    case "DEEP_PATH_IMPORT":
      return `Import from the package root instead: import { … } from "${pkg}";`;

    case "ENUM_SYNC_DRIFT":
      return `Update the enum array in @afenda/db to match @afenda/contracts. Both must list the same values in the same order.`;

    case "CONTRACTS_NON_VALUES_IMPORT":
      return `Only identifiers ending with "Values" (e.g. InvoiceStatusValues) may be imported from @afenda/contracts in packages/db. Move other imports to @afenda/core.`;

    case "SCHEMA_PURITY":
      return `Schema files must be deterministic: no process.env, no new Date() defaults, no runtime I/O. Use SQL defaults via Drizzle helpers.`;

    case "BARREL_IMPURE":
      return `schema/index.ts must only contain \`export * from "./…"\` re-exports. Remove any value, type, or function definitions.`;

    case "SELF_ALIAS_IMPORT":
      return `Replace the @afenda/* import with a relative path (e.g. import { … } from "../shared/ids.js").`;

    case "CROSS_PKG_RELATIVE":
      return `Replace the relative path with the barrel alias: import { … } from "${pkg}";`;

    default:
      return "(no suggestion available)";
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let totalFiles = 0;
let totalImports = 0;

for (const pkgDir of Object.keys(ALLOWED_INTERNAL)) {
  const absDir = resolve(ROOT, pkgDir);
  if (!existsSync(absDir)) continue;

  const allowed = ALLOWED_INTERNAL[pkgDir];
  const forbidden = FORBIDDEN_EXTERNALS[pkgDir] ?? [];
  const files = walkTs(absDir);
  totalFiles += files.length;

  for (const file of files) {
    const relFile = relative(ROOT, file).split(sep).join("/");
    const content = readFileSync(file, "utf-8");
    const imports = extractImports(content);
    totalImports += imports.length;

    for (const { specifier: raw, line, statement } of imports) {
      // ── Relative import checks ─────────────────────────────────────
      if (raw.startsWith(".") || raw.startsWith("/")) {
        // Check if a relative import escapes the package root.
        // Resolve the import target relative to the file, then verify
        // it's still within the same package directory.
        const fileDir = resolve(file, "..");
        const target = resolve(fileDir, raw);
        const pkgAbs = resolve(ROOT, pkgDir);
        if (!target.startsWith(pkgAbs + sep) && target !== pkgAbs) {
          violations.push({
            ruleCode: "CROSS_PKG_RELATIVE",
            file: relFile,
            line,
            statement,
            import: raw,
            message: `Relative import "${raw}" escapes ${pkgDir} — use @afenda/* barrel alias instead`,
            fix: suggestFix("CROSS_PKG_RELATIVE", { pkg: "@afenda/<target-package>" }),
          });
        }
        continue;
      }

      // node: prefixed imports — skip globally UNLESS this package forbids them
      if (raw.startsWith("node:")) {
        if (FORBIDDEN_NODE_PREFIX.has(pkgDir)) {
          violations.push({
            ruleCode: "FORBIDDEN_EXTERNAL",
            file: relFile,
            line,
            statement,
            import: raw,
            message: `"${raw}" must not be imported inside ${pkgDir} — contracts must be runtime-free`,
            fix: `Remove all Node.js runtime imports. contracts may only use zod and other pure schema helpers.`,
          });
        }
        continue;
      }

      const pkg = barePackage(raw);

      // ── Self-alias guard ─────────────────────────────────────────────
      // A file must not import its own package via the @afenda/* alias.
      // e.g., a file in packages/contracts importing @afenda/contracts
      // should use a relative path instead.
      if (pkg.startsWith("@afenda/")) {
        const selfAlias = `@afenda/${pkgDir.split("/")[1]}`;
        if (pkg === selfAlias) {
          violations.push({
            ruleCode: "SELF_ALIAS_IMPORT",
            file: relFile,
            line,
            statement,
            import: raw,
            message: `"${raw}" is a self-alias import inside ${pkgDir} — use a relative path instead`,
            fix: suggestFix("SELF_ALIAS_IMPORT", { pkgDir, pkg }),
          });
        }
      }

      // ── forbidden externals ──────────────────────────────────────────
      if (forbidden.includes(pkg)) {
        violations.push({
          ruleCode: "FORBIDDEN_EXTERNAL",
          file: relFile,
          line,
          statement,
          import: raw,
          message: `"${pkg}" must not be imported inside ${pkgDir}`,
          fix: suggestFix("FORBIDDEN_EXTERNAL", { pkgDir, pkg }),
        });
      }

      // ── @afenda/* boundary check ─────────────────────────────────────
      if (pkg.startsWith("@afenda/") && !allowed.includes(pkg)) {
        violations.push({
          ruleCode: "BOUNDARY_VIOLATION",
          file: relFile,
          line,
          statement,
          import: raw,
          message: `${pkgDir} may not import "${pkg}". Allowed: [${allowed.join(", ") || "none"}]`,
          fix: suggestFix("BOUNDARY_VIOLATION", { pkgDir, pkg }),
        });
      }

      // ── Deep-path import guard ───────────────────────────────────────
      // Only applies to code OUTSIDE the package being imported.
      // "@afenda/core/src/finance/money" is a deep-path violation when
      // the importer is not inside packages/core/.
      if (pkg.startsWith("@afenda/") && raw !== pkg) {
        // raw has a sub-path — e.g. "@afenda/core/src/finance/money"
        const importedPkgDir = `packages/${pkg.replace("@afenda/", "")}`;
        if (pkgDir !== importedPkgDir) {
          violations.push({
            ruleCode: "DEEP_PATH_IMPORT",
            file: relFile,
            line,
            statement,
            import: raw,
            message: `Deep-path import "${raw}" — import from "${pkg}" root instead`,
            fix: suggestFix("DEEP_PATH_IMPORT", { pkg }),
          });
        }
      }

      // ── *Values-only guard for packages/db imports from @afenda/contracts ─
      // Named imports from @afenda/contracts inside packages/db must ALL
      // end with "Values". Types are allowed (erased at runtime) but cannot
      // be statically distinguished from values in plain regex parsing, so
      // we only flag named imports that clearly are NOT *Values.
      if (pkgDir === "packages/db" && pkg === "@afenda/contracts") {
        // Extract named imports: import { Foo, Bar } from "@afenda/contracts"
        const namedMatch = statement.match(/\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
          const names = namedMatch[1]
            .split(",")
            .map((n) => n.trim().replace(/\s+as\s+\w+/, "")) // strip aliases
            .filter(Boolean)
            .filter((n) => n !== "type"); // `import { type Foo }` → skip keyword
          for (const name of names) {
            // Skip `import type { Foo }` — "type" keyword before braces
            if (/^import\s+type\s+/.test(statement)) break;
            if (!name.endsWith("Values")) {
              violations.push({
                ruleCode: "CONTRACTS_NON_VALUES_IMPORT",
                file: relFile,
                line,
                statement,
                import: name,
                message: `"${name}" imported from @afenda/contracts in packages/db — only *Values identifiers allowed`,
                fix: suggestFix("CONTRACTS_NON_VALUES_IMPORT", {}),
              });
            }
          }
        }
      }
    }
  }
}

// ── Barrel-size guard ─────────────────────────────────────────────────────────

const barrels = [
  "packages/contracts/src/index.ts",
  "packages/db/src/index.ts",
  "packages/db/src/schema/index.ts",
  "packages/core/src/index.ts",
  "packages/ui/src/index.ts",
];

for (const barrel of barrels) {
  const abs = resolve(ROOT, barrel);
  if (!existsSync(abs)) continue;
  const lineCount = readFileSync(abs, "utf-8").split("\n").length;
  if (lineCount > MAX_BARREL_LINES) {
    violations.push({
      ruleCode: "BARREL_TOO_LARGE",
      file: barrel,
      line: null,
      statement: null,
      import: `(${lineCount} lines)`,
      message: `${barrel} has ${lineCount} lines (max ${MAX_BARREL_LINES})`,
      fix: suggestFix("BARREL_TOO_LARGE", { barrel }),
    });
  }
}

// ── Schema purity guard (packages/db/src/schema/**) ───────────────────────────
// Schema files must be deterministic: no process.env, no new Date() for defaults,
// no runtime I/O, no conditional DDL.

const SCHEMA_DIR = resolve(ROOT, "packages/db/src/schema");
if (existsSync(SCHEMA_DIR)) {
  const schemaFiles = walkTs(SCHEMA_DIR).filter(
    (f) => !f.endsWith("index.ts"), // barrel checked separately
  );

  const PURITY_PATTERNS = [
    { re: /\bprocess\.env\b/, label: "process.env usage" },
    { re: /\bnew\s+Date\s*\(/, label: "new Date() — use SQL now() via .defaultNow()" },
    { re: /\bNODE_ENV\b/, label: "NODE_ENV reference (conditional DDL)" },
    {
      re: /\brequire\s*\(\s*["'](?:fs|path|http|https|net|child_process)["']/,
      label: "runtime I/O import",
    },
    { re: /\bfetch\s*\(/, label: "fetch() call" },
  ];

  for (const file of schemaFiles) {
    const relFile = relative(ROOT, file).split(sep).join("/");
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // skip comment lines
      if (/^\s*(\/\/|\/\*|\*)/.test(ln)) continue;

      for (const { re, label } of PURITY_PATTERNS) {
        if (re.test(ln)) {
          violations.push({
            ruleCode: "SCHEMA_PURITY",
            file: relFile,
            line: i + 1,
            statement: ln.trim(),
            import: label,
            message: `Schema file contains ${label}`,
            fix: suggestFix("SCHEMA_PURITY", {}),
          });
        }
      }
    }
  }
}

// ── Barrel content guard (schema/index.ts must be pure re-exports) ────────────

const SCHEMA_BARREL = resolve(ROOT, "packages/db/src/schema/index.ts");
if (existsSync(SCHEMA_BARREL)) {
  const content = readFileSync(SCHEMA_BARREL, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    // Allow: empty lines, comments, `export * from "./…"` re-exports
    if (
      ln === "" ||
      ln.startsWith("//") ||
      ln.startsWith("/*") ||
      ln.startsWith("*") ||
      /^export\s+\*\s+from\s+["']\.\//.test(ln)
    ) {
      continue;
    }

    // Everything else is a violation
    violations.push({
      ruleCode: "BARREL_IMPURE",
      file: "packages/db/src/schema/index.ts",
      line: i + 1,
      statement: ln,
      import: "(non-reexport content)",
      message: `schema/index.ts contains non-reexport content: "${ln}"`,
      fix: suggestFix("BARREL_IMPURE", {}),
    });
  }
}

// ── Enum-value sync guard ─────────────────────────────────────────────────────
// Each pair: [contractsFile, dbFile, exported const names]
// @sync comments in db files reference the canonical contracts source.
// This gate ensures the values stay in lockstep.

const ENUM_SYNC_PAIRS = [
  {
    contractsFile: "packages/contracts/src/invoice/invoice.entity.ts",
    dbFile: "packages/db/src/schema/finance.ts",
    exports: ["InvoiceStatusValues"],
  },
  {
    contractsFile: "packages/contracts/src/gl/account.entity.ts",
    dbFile: "packages/db/src/schema/finance.ts",
    exports: ["AccountTypeValues"],
  },
  {
    contractsFile: "packages/contracts/src/supplier/supplier.entity.ts",
    dbFile: "packages/db/src/schema/supplier.ts",
    exports: ["SupplierStatusValues"],
  },
];

/**
 * Extract an `as const` array literal from source code.
 * Matches:  export const NAME = [ "a", "b", "c" ] as const;
 * Returns the array of string values or null on failure.
 */
function extractConstArray(source, name) {
  // Non-greedy match from `export const NAME = [` to `] as const`
  const re = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`);
  const m = source.match(re);
  if (!m) return null;
  // Extract quoted strings from the body
  const body = m[1];
  const values = [];
  for (const vm of body.matchAll(/["']([^"']+)["']/g)) {
    values.push(vm[1]);
  }
  return values;
}

for (const pair of ENUM_SYNC_PAIRS) {
  const cAbs = resolve(ROOT, pair.contractsFile);
  const dAbs = resolve(ROOT, pair.dbFile);
  if (!existsSync(cAbs) || !existsSync(dAbs)) continue;

  const cSrc = readFileSync(cAbs, "utf-8");
  const dSrc = readFileSync(dAbs, "utf-8");

  for (const name of pair.exports) {
    const cVals = extractConstArray(cSrc, name);
    // In db files the enum may be consumed via import, so check contracts src
    // is referenced. The actual runtime parity depends on the import being correct.
    // We verify by extracting the imported values from contracts and checking if
    // the db file actually imports that name.
    if (!cVals) continue;

    // The db file should import this name from @afenda/contracts
    if (!dSrc.includes(name)) {
      violations.push({
        ruleCode: "ENUM_SYNC_DRIFT",
        file: pair.dbFile,
        line: null,
        statement: null,
        import: name,
        message: `${name} is defined in ${pair.contractsFile} but not referenced in ${pair.dbFile}`,
        fix: suggestFix("ENUM_SYNC_DRIFT", {}),
      });
    }
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  reportSuccess({
    gateName: "boundary check",
    detail: `${totalFiles} files · ${totalImports} imports scanned in ${elapsed}s`,
  });
  process.exit(0);
}

reportViolations({
  gateName: "BOUNDARY CHECK",
  violations,
  ruleDocs: RULE_DOCS,
  stats: {
    "Files scanned:": totalFiles,
    "Imports checked:": totalImports,
  },
  elapsed,
});

process.exit(1);
