#!/usr/bin/env node
/**
 * tools/gates/barrel-export-conflicts.mjs
 *
 * CI gate: detects duplicate export names that would collide in a barrel
 * (index.ts) using `export * from` chains.
 *
 * Uses the TypeScript Compiler API (AST-only, no type-checking) for accurate
 * export extraction. This replaced the previous regex-based approach.
 *
 * ─── Why ────────────────────────────────────────────────────────────────────
 *
 * TypeScript only reports TS2308 ("Module X has already exported a member
 * named Y") at the **root** barrel where two `export * from` lines are
 * co-located. By that point the conflict is already in the tree; tsc is the
 * only guard, and it provides no pointer to which upstream file added the
 * duplicate.
 *
 * This gate runs before tsc, traces every `export *` chain reachable from
 * the root barrel, collects all exported names, and reports collisions it
 * finds — with the concrete file paths, line numbers, and columns.
 *
 * ─── Rule ───────────────────────────────────────────────────────────────────
 *
 *  BARREL_EXPORT_CONFLICT — Two or more source files reachable from a
 *  barrel's `export * from` chains export the same name. The name will cause
 *  a TS2308 compile error at the barrel level.
 *
 *  Fix: Rename the symbol in one of the source files to be domain-prefixed
 *  (e.g. `HrAttachEvidenceCommandSchema` for the HR module variant).
 *
 * ─── Naming Convention (ADR-0005 enforcement) ───────────────────────────────
 *
 *  Every export that has a generic name (not inherently domain-scoped) MUST
 *  carry the domain pillar prefix so it is unique across the barrel:
 *
 *    Pillar / module  │  Required prefix
 *    ─────────────────┼─────────────────────────────
 *    erp/hr           │  Hr  or  Hrm
 *    erp/finance/ap   │  Ap
 *    erp/finance/gl   │  Gl
 *    erp/finance/ar   │  Ar
 *    erp/supplier     │  Supplier
 *    erp/purchasing   │  Purchasing / Po
 *    kernel/gov/audit │  Audit (already standard)
 *    kernel/gov/evid  │  Evidence / Doc (already standard)
 *    comm/notif       │  Notification / Notif
 *
 *  Schemas that are already domain-unique (e.g. InvoiceSchema, OrgSchema)
 *  do not need an additional prefix.
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *
 *   node tools/gates/barrel-export-conflicts.mjs
 *   # exits 0 if clean, 1 if conflicts found
 *
 * ─── Scope ──────────────────────────────────────────────────────────────────
 *
 *  Only scans packages/contracts/src — the only package with deep `export *`
 *  barrel chains that feed a single root index.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CONTRACTS_SRC = resolve(ROOT, "packages/contracts/src");
const ROOT_BARREL = resolve(CONTRACTS_SRC, "index.ts");

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  BARREL_EXPORT_CONFLICT: {
    why: "Two source files reachable from a shared barrel both export the same name. TypeScript will fail with TS2308 at the barrel level, and the compiler error gives no indication of which upstream file introduced the duplicate.",
    docs: "See AGENTS.md §9 Naming Conventions — domain-prefix rule. See also tools/gates/barrel-export-conflicts.mjs §Naming Convention.",
  },
};

function suggestFix(name, occurrences) {
  const lines = [`Rename '${name}' in one of the files to be domain-prefixed.`];
  for (const o of occurrences) {
    lines.push(`  ${relative(ROOT, o.file)}:${o.line}:${o.column}`);
  }
  lines.push(`  Example: if '${name}' lives in an hr/ module, rename it 'Hr${name}'.`);
  return lines.join("\n");
}

// ─── AST helpers ──────────────────────────────────────────────────────────────

/**
 * Parse a TypeScript source file into an AST (no type-checking).
 * Returns null if file doesn't exist or can't be read.
 */
function parseFile(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const src = readFileSync(filePath, "utf8");
    return ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true);
  } catch {
    return null;
  }
}

/**
 * Get 1-based line and column of an AST node.
 */
function getPosition(sourceFile, node) {
  const { line, character } = ts.getLineAndCharacterOfPosition(
    sourceFile,
    node.getStart(sourceFile),
  );
  return { line: line + 1, column: character + 1 };
}

/**
 * Extract `export * from '...'` targets from a source file's AST and
 * identify namespaced ones (`export * as Ns from '...'`) which don't cause
 * name conflicts.
 *
 * @returns {{ stars: string[], namespaced: Set<string> }}
 */
function extractStarReExports(sourceFile) {
  const stars = [];
  const namespaced = new Set();

  for (const stmt of sourceFile.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.moduleSpecifier) continue;
    const spec = stmt.moduleSpecifier.text;

    if (!stmt.exportClause) {
      // export * from '...' (including export type * from '...')
      stars.push(spec);
    } else if (ts.isNamespaceExport(stmt.exportClause)) {
      // export * as Ns from '...' — scoped to a namespace, no conflict
      namespaced.add(spec);
    }
  }

  return { stars, namespaced };
}

/**
 * Extract directly declared export names from a source file's AST.
 *
 * Returns Map<name, { line, column }> with 1-based position info.
 *
 * Handles:
 *   export const / let / var  (including destructuring)
 *   export function / class / abstract class
 *   export interface / type / enum
 *   export { A, B }  (local grouping, no `from` clause)
 *
 * Intentionally EXCLUDES `export { ... } from '...'` — those are transparent
 * re-exports whose names canonically belong to the source module, not this
 * file. Including them would produce false-positive conflicts when a barrel
 * re-exports both a payload file and a wrapper that transparently re-exports
 * the same payload names (e.g. comm/boardroom).
 */
function extractDirectExportNames(sourceFile) {
  const names = new Map();

  for (const stmt of sourceFile.statements) {
    const hasExport = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

    // ── export { A, B } — local grouping only (no from clause) ───────
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.moduleSpecifier) continue; // has `from` → skip
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          // For `export { A as B }` el.name is B (exported), el.propertyName is A
          const exportedName = el.name.text;
          const pos = getPosition(sourceFile, el.name);
          if (!names.has(exportedName)) names.set(exportedName, pos);
        }
      }
      continue;
    }

    if (!hasExport) continue;

    // ── export const / let / var ─────────────────────────────────────
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          names.set(decl.name.text, getPosition(sourceFile, decl.name));
        } else if (ts.isObjectBindingPattern(decl.name)) {
          for (const el of decl.name.elements) {
            if (ts.isIdentifier(el.name)) {
              names.set(el.name.text, getPosition(sourceFile, el.name));
            }
          }
        } else if (ts.isArrayBindingPattern(decl.name)) {
          for (const el of decl.name.elements) {
            if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) {
              names.set(el.name.text, getPosition(sourceFile, el.name));
            }
          }
        }
      }
      continue;
    }

    // ── export function / class ──────────────────────────────────────
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      names.set(stmt.name.text, getPosition(sourceFile, stmt.name));
      continue;
    }
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      names.set(stmt.name.text, getPosition(sourceFile, stmt.name));
      continue;
    }

    // ── export interface / type / enum ───────────────────────────────
    if (ts.isInterfaceDeclaration(stmt)) {
      names.set(stmt.name.text, getPosition(sourceFile, stmt.name));
      continue;
    }
    if (ts.isTypeAliasDeclaration(stmt)) {
      names.set(stmt.name.text, getPosition(sourceFile, stmt.name));
      continue;
    }
    if (ts.isEnumDeclaration(stmt)) {
      names.set(stmt.name.text, getPosition(sourceFile, stmt.name));
      continue;
    }
  }

  return names;
}

// ─── File resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a module specifier (possibly with `.js` extension, as TypeScript
 * requires for ESM) to an actual `.ts` file on disk.
 *
 * Resolution order:
 *   1. specifier with .ts extension (replacing .js)
 *   2. specifier/index.ts (directory barrel)
 *   3. specifier as-is (already .ts)
 *   4. specifier without .js + /index.ts
 */
function resolveModuleToFile(specifier, fromFile) {
  const fromDir = dirname(fromFile);
  const candidates = [];

  if (specifier.endsWith(".js")) {
    candidates.push(resolve(fromDir, specifier.replace(/\.js$/, ".ts")));
  }
  candidates.push(resolve(fromDir, specifier + "/index.ts"));
  candidates.push(resolve(fromDir, specifier));
  candidates.push(resolve(fromDir, specifier.replace(/\.js$/, "") + "/index.ts"));

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ─── Unified file tracer ─────────────────────────────────────────────────────

/**
 * DFS through all files reachable via `export * from` chains.
 *
 * For each visited file:
 *   1. Extract its directly declared exports → add to nameIndex
 *   2. Follow all `export * from` chains recursively
 *
 * This unified approach correctly handles mixed files (files with both direct
 * exports and `export *` re-exports) and avoids the previous barrel-vs-leaf
 * distinction. Previously, aggregator files like `all-errors.ts` were
 * classified as leaves because they lacked an `index.ts` filename, causing
 * their re-exported chains to be silently skipped.
 *
 * @param {string} filePath — absolute path to current file
 * @param {Set<string>} visited — cycle guard
 * @param {Map<string, Map<string, {line: number, column: number}>>} nameIndex
 *   exportedName → Map<absoluteFilePath, position>.
 *   Names appearing in multiple files (inner Map.size > 1) are conflicts.
 */
function traceFile(filePath, visited, nameIndex) {
  if (visited.has(filePath)) return;
  visited.add(filePath);

  const sf = parseFile(filePath);
  if (!sf) return;

  // 1. Harvest direct exports from this file (with positions)
  const directExports = extractDirectExportNames(sf);
  for (const [name, pos] of directExports) {
    if (!nameIndex.has(name)) nameIndex.set(name, new Map());
    const fileMap = nameIndex.get(name);
    if (!fileMap.has(filePath)) {
      fileMap.set(filePath, pos);
    }
  }

  // 2. Follow export * chains
  const { stars, namespaced } = extractStarReExports(sf);
  for (const spec of stars) {
    if (namespaced.has(spec)) continue;
    const resolved = resolveModuleToFile(spec, filePath);
    if (!resolved) continue;
    traceFile(resolved, visited, nameIndex);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!existsSync(ROOT_BARREL)) {
  console.error(`[barrel-export-conflicts] Root barrel not found: ${ROOT_BARREL}`);
  process.exit(0); // non-fatal if contracts package doesn't exist yet
}

const start = Date.now();
const visited = new Set();
const nameIndex = new Map(); // name → Map<file, {line, column}>

traceFile(ROOT_BARREL, visited, nameIndex);

// Build violations: names exported by more than one source file
const violations = [];
for (const [name, fileMap] of nameIndex) {
  if (fileMap.size <= 1) continue;

  const occurrences = Array.from(fileMap.entries())
    .map(([file, pos]) => ({ file, line: pos.line, column: pos.column }))
    .sort((a, b) => a.file.localeCompare(b.file));

  violations.push({
    ruleCode: "BARREL_EXPORT_CONFLICT",
    file: relative(ROOT, occurrences[1].file),
    line: occurrences[1].line,
    message:
      `'${name}' is exported by ${occurrences.length} files:\n` +
      occurrences.map((o) => `    ${relative(ROOT, o.file)}:${o.line}:${o.column}`).join("\n"),
    fix: suggestFix(name, occurrences),
  });
}

const elapsed = ((Date.now() - start) / 1000).toFixed(2);

if (violations.length > 0) {
  reportViolations({
    gateName: "barrel-export-conflicts",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Files traced:": visited.size,
      "Names indexed:": nameIndex.size,
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "barrel-export-conflicts",
    detail: `Traced ${visited.size} file(s), ${nameIndex.size} unique export name(s) — no conflicts found.`,
  });
  process.exit(0);
}
