#!/usr/bin/env node
/**
 * tools/gates/schema-invariants.mjs
 *
 * CI gate: enforces ERP-grade structural invariants on Drizzle schema files.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. ORG_SCOPED_UNIQUE   — unique constraints on org-scoped tables must
 *                            include orgId as the first column.
 *  2. FK_MUST_BE_INDEXED  — every .references() column must have a
 *                            corresponding index() or unique() covering it.
 *  3. MUTABLE_REQUIRES_UPDATED_AT — mutable tables must have an updatedAt
 *                            column in the Drizzle schema.
 *  4. CHECK_CONSTRAINT_DRIFT — tables using text-based kind/type columns
 *                            with known value sets must have a check() or
 *                            pgEnum() declared in Drizzle.
 *  5. RELATIONS_SIZE_WARNING — warn (non-fatal) if relations.ts > 500 lines.
 *
 * Usage:
 *   node tools/gates/schema-invariants.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCHEMA_DIR = resolve(ROOT, "packages/db/src/schema");

/**
 * Append-only / immutable tables that are exempt from the updatedAt rule.
 * These tables are either insert-only, join tables, or seed data.
 */
const APPEND_ONLY_TABLES = new Set([
  "audit_log",
  "outbox_event",
  "invoice_status_history",
  "journal_entry",
  "journal_line",
  "evidence_operation",
  "document",
  "evidence",
  "person",
  "organization",
  "iam_permission",
  "iam_role_permission",
  "iam_principal_role",
  "membership",
  "dead_letter_job",
]);

const RELATIONS_MAX_LINES = 500;

/**
 * FK columns that are intentionally unindexed.
 * Nullable SET NULL FKs on low-cardinality principal references don't need
 * indexes — the SET NULL cascade happens rarely (only on principal deletion)
 * and a seq scan on a handful of rows is acceptable.
 */
const FK_INDEX_EXEMPT = new Set([
  "submitted_by_principal_id",
  "actor_principal_id",
  "posted_by_principal_id",
  "uploaded_by_principal_id",
  "attached_by_principal_id",
  "onboarded_by_principal_id",
]);

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  ORG_SCOPED_UNIQUE: {
    why: "Unique constraints without orgId allow cross-tenant collisions in a multi-org system.",
    docs: "See docs/adr/upgrade.md — Step 4: ORG_SCOPED_UNIQUE",
  },
  FK_MUST_BE_INDEXED: {
    why: "Unindexed foreign keys cause sequential scans on JOIN and CASCADE DELETE, degrading performance at scale.",
    docs: "See docs/adr/upgrade.md — Step 4: FK_MUST_BE_INDEXED",
  },
  MUTABLE_REQUIRES_UPDATED_AT: {
    why: "Mutable tables without updatedAt lose auditability and can't support optimistic concurrency or cache invalidation.",
    docs: "See docs/adr/upgrade.md — Step 4: MUTABLE_REQUIRES_UPDATED_AT",
  },
  CHECK_CONSTRAINT_DRIFT: {
    why: "Text columns with known value domains need check() or pgEnum() in Drizzle to prevent schema drift between TS and SQL.",
    docs: "See docs/adr/upgrade.md — Step 4: CHECK_CONSTRAINT_DRIFT",
  },
  RELATIONS_SIZE_WARNING: {
    why: "A large relations.ts becomes hard to review and is a signal to split into domain-specific relation files.",
    docs: "See docs/adr/upgrade.md — Step 4: RELATIONS_SIZE_WARNING",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "ORG_SCOPED_UNIQUE":
      return `Add orgId (t.orgId) as the first column in the unique constraint: unique("${ctx.constraintName}").on(t.orgId, ...).`;
    case "FK_MUST_BE_INDEXED":
      return `Add index("${ctx.tableName}_${ctx.columnName}_idx").on(t.${ctx.fieldName}) to the table's third argument array.`;
    case "MUTABLE_REQUIRES_UPDATED_AT":
      return `Add updatedAt: tsz("updated_at").defaultNow().notNull() to the "${ctx.tableName}" table columns and a set_updated_at trigger in 0000_init.sql.`;
    case "CHECK_CONSTRAINT_DRIFT":
      return `Add check("${ctx.tableName}_${ctx.columnName}_check", sql\`...\`) or use pgEnum() for column "${ctx.columnName}" in table "${ctx.tableName}".`;
    case "RELATIONS_SIZE_WARNING":
      return `Split relations.ts into domain-specific files (e.g. iam.relations.ts, finance.relations.ts) and re-export from the barrel.`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Parsing Helpers ─────────────────────────────────────────────────────────

/**
 * Extract table definitions from a Drizzle schema file.
 * Returns an array of { name, sqlName, body, startLine } objects.
 */
function extractTables(content, relFile) {
  const tables = [];
  // Match: export const <name> = pgTable( "sql_name", { ... }, (t) => [...] )
  const re = /export\s+const\s+(\w+)\s*=\s*pgTable\(\s*\n?\s*"(\w+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const varName = m[1];
    const sqlName = m[2];
    const startIdx = m.index;
    const startLine = content.substring(0, startIdx).split("\n").length;

    // Find the matching closing of pgTable(...)
    let depth = 0;
    let bodyStart = content.indexOf("(", startIdx);
    let i = bodyStart;
    for (; i < content.length; i++) {
      if (content[i] === "(") depth++;
      else if (content[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = content.substring(bodyStart, i + 1);
    tables.push({ varName, sqlName, body, startLine, file: relFile });
  }
  return tables;
}

/**
 * Check if table body contains an orgId column.
 */
function hasOrgId(body) {
  return /org_id/.test(body) && /orgId/.test(body);
}

/**
 * Check if table body has an updatedAt column.
 */
function hasUpdatedAt(body) {
  return /updated_at/.test(body);
}

/**
 * Extract unique constraint names and their column lists from a table body.
 * Matches patterns like: unique("name").on(t.col1, t.col2)
 */
function extractUniques(body) {
  const uniques = [];
  const re = /unique\(\s*"([^"]+)"\s*\)\s*\.on\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const name = m[1];
    const colsRaw = m[2];
    const cols = colsRaw.split(",").map((c) => c.trim().replace(/^t\./, ""));
    uniques.push({ name, cols });
  }
  return uniques;
}

/**
 * Extract .references() column field names from a table body.
 * Returns array of { fieldName, columnName } where fieldName is the JS name
 * and columnName is the SQL column name.
 */
function extractForeignKeys(body) {
  const fks = [];
  // Match: fieldName: uuid("column_name")...references(
  const re = /(\w+):\s*uuid\("(\w+)"\)[^,}]*\.references\(/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    fks.push({ fieldName: m[1], columnName: m[2] });
  }
  return fks;
}

/**
 * Extract index and unique column names from table's third argument.
 * Matches: index("...").on(t.col1, t.col2) and unique("...").on(...)
 * Also treats primaryKey columns as indexed.
 */
function extractIndexedColumns(body) {
  const indexed = new Set();

  // Primary key columns are implicitly indexed
  const pkRe = /\.primaryKey\(\)/g;
  // Find which field has .primaryKey()
  const fieldPkRe = /(\w+):\s*uuid\("[^"]+"\)[^,}]*\.primaryKey\(\)/g;
  let m;
  while ((m = fieldPkRe.exec(body)) !== null) {
    indexed.add(m[1]);
  }

  // Composite primary key columns
  const compPkRe = /primaryKey\(\s*\{\s*columns:\s*\[([^\]]+)\]/g;
  while ((m = compPkRe.exec(body)) !== null) {
    const cols = m[1].split(",").map((c) => c.trim().replace(/^t\./, ""));
    for (const c of cols) indexed.add(c);
  }

  // index("...").on(t.col1, t.col2, ...) — ALL columns in each index
  const idxRe = /index\("[^"]+"\)\s*\.on\(([^)]+)\)/g;
  while ((m = idxRe.exec(body)) !== null) {
    const cols = m[1].split(",").map((c) => c.trim().replace(/^t\./, ""));
    for (const c of cols) indexed.add(c);
  }

  // unique("...").on(t.col1, t.col2, ...) — ALL columns
  const uniqRe = /unique\("[^"]+"\)\s*\.on\(([^)]+)\)/g;
  while ((m = uniqRe.exec(body)) !== null) {
    const cols = m[1].split(",").map((c) => c.trim().replace(/^t\./, ""));
    for (const c of cols) indexed.add(c);
  }

  // .unique() on column definition
  const colUniqRe = /(\w+):\s*\w+\("[^"]+"\)[^,}]*\.unique\(\)/g;
  while ((m = colUniqRe.exec(body)) !== null) {
    indexed.add(m[1]);
  }

  return indexed;
}

/**
 * Check if a table has a check() constraint or pgEnum for a given column.
 */
function hasCheckOrEnum(body, fieldName) {
  // check() containing the field name
  if (new RegExp(`check\\s*\\(`).test(body) && new RegExp(`\\b${fieldName}\\b`).test(body)) {
    return true;
  }
  // pgEnum used on the column (the column type references an enum)
  if (new RegExp(`${fieldName}:\\s*\\w+Enum\\(`).test(body)) {
    return true;
  }
  return false;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let tableCount = 0;
let fileCount = 0;

// Scan schema files (skip _helpers.ts, index.ts, relations.ts)
const schemaFiles = ["iam.ts", "finance.ts", "document.ts", "supplier.ts", "infra.ts"];

for (const fileName of schemaFiles) {
  const filePath = resolve(SCHEMA_DIR, fileName);
  if (!existsSync(filePath)) continue;
  fileCount++;

  const content = readFileSync(filePath, "utf-8");
  const relFile = relative(ROOT, filePath).split(sep).join("/");
  const tables = extractTables(content, relFile);
  tableCount += tables.length;

  for (const table of tables) {
    const isOrgScoped = hasOrgId(table.body);

    // ── Rule 1: ORG_SCOPED_UNIQUE ──────────────────────────────────────
    if (isOrgScoped) {
      const uniques = extractUniques(table.body);
      for (const u of uniques) {
        if (u.cols[0] !== "orgId") {
          violations.push({
            ruleCode: "ORG_SCOPED_UNIQUE",
            file: relFile,
            line: table.startLine,
            message: `unique("${u.name}") on org-scoped table "${table.sqlName}" does not include orgId as the first column. Columns: [${u.cols.join(", ")}]`,
            fix: suggestFix("ORG_SCOPED_UNIQUE", { constraintName: u.name }),
          });
        }
      }
    }

    // ── Rule 2: FK_MUST_BE_INDEXED ─────────────────────────────────────
    const fks = extractForeignKeys(table.body);
    const indexedCols = extractIndexedColumns(table.body);

    for (const fk of fks) {
      // Skip self-referential PKs (person.id -> party.id) — PK is already indexed
      if (fk.fieldName === "id") continue;
      // Skip if FK column is covered by any index
      if (indexedCols.has(fk.fieldName)) continue;
      // Skip intentionally unindexed nullable SET NULL principal FKs
      if (FK_INDEX_EXEMPT.has(fk.columnName)) continue;

      violations.push({
        ruleCode: "FK_MUST_BE_INDEXED",
        file: relFile,
        line: table.startLine,
        message: `FK column "${fk.columnName}" (${fk.fieldName}) on table "${table.sqlName}" has no covering index`,
        fix: suggestFix("FK_MUST_BE_INDEXED", {
          tableName: table.sqlName,
          columnName: fk.columnName,
          fieldName: fk.fieldName,
        }),
      });
    }

    // ── Rule 3: MUTABLE_REQUIRES_UPDATED_AT ────────────────────────────
    if (!APPEND_ONLY_TABLES.has(table.sqlName) && !hasUpdatedAt(table.body)) {
      violations.push({
        ruleCode: "MUTABLE_REQUIRES_UPDATED_AT",
        file: relFile,
        line: table.startLine,
        message: `Mutable table "${table.sqlName}" is missing an updatedAt column`,
        fix: suggestFix("MUTABLE_REQUIRES_UPDATED_AT", { tableName: table.sqlName }),
      });
    }

    // ── Rule 4: CHECK_CONSTRAINT_DRIFT ─────────────────────────────────
    // Detect text columns named "kind" or "type" that aren't covered by
    // check() or pgEnum. These are the most common drift vectors.
    const kindTypeRe = /(\w+):\s*text\("(\w+)"\)/g;
    let km;
    while ((km = kindTypeRe.exec(table.body)) !== null) {
      const fieldName = km[1];
      const colName = km[2];
      // Only "kind" and "status" — "type" is too generic (e.g. outbox_event.type is freeform)
      if (!["kind", "status"].includes(colName)) continue;
      if (!hasCheckOrEnum(table.body, fieldName)) {
        violations.push({
          ruleCode: "CHECK_CONSTRAINT_DRIFT",
          file: relFile,
          line: table.startLine,
          message: `Text column "${colName}" on table "${table.sqlName}" looks like an enum but has no check() or pgEnum()`,
          fix: suggestFix("CHECK_CONSTRAINT_DRIFT", {
            tableName: table.sqlName,
            columnName: colName,
          }),
        });
      }
    }
  }
}

// ── Rule 5: RELATIONS_SIZE_WARNING ─────────────────────────────────────
const relationsPath = resolve(SCHEMA_DIR, "relations.ts");
if (existsSync(relationsPath)) {
  const relContent = readFileSync(relationsPath, "utf-8");
  const lineCount = relContent.split("\n").length;
  if (lineCount > RELATIONS_MAX_LINES) {
    violations.push({
      ruleCode: "RELATIONS_SIZE_WARNING",
      file: relative(ROOT, relationsPath).split(sep).join("/"),
      line: 1,
      message: `relations.ts is ${lineCount} lines (limit: ${RELATIONS_MAX_LINES}). Consider splitting into domain files.`,
      fix: suggestFix("RELATIONS_SIZE_WARNING"),
    });
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

// Filter out non-fatal warnings for exit code purposes
const fatalViolations = violations.filter(
  (v) => v.ruleCode !== "RELATIONS_SIZE_WARNING",
);

if (fatalViolations.length > 0) {
  reportViolations({
    gateName: "schema-invariants check",
    violations,
    ruleDocs: RULE_DOCS,
    stats: { "Schema files:": fileCount, "Tables:": tableCount },
    elapsed,
  });
  process.exit(1);
} else if (violations.length > 0) {
  // Has warnings but no fatal violations — print warnings but pass
  reportViolations({
    gateName: "schema-invariants check (warnings only)",
    violations,
    ruleDocs: RULE_DOCS,
    stats: { "Schema files:": fileCount, "Tables:": tableCount },
    elapsed,
  });
  // Don't exit(1) for warnings
  console.log(`✅ schema-invariants check passed — 0 fatal violations (${violations.length} warning${violations.length > 1 ? "s" : ""})`);
} else {
  reportSuccess({
    gateName: "schema-invariants check",
    detail: `${tableCount} tables · ${fileCount} schema files scanned in ${elapsed}s`,
  });
}
