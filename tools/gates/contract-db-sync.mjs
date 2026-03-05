#!/usr/bin/env node
/**
 * tools/gates/contract-db-sync.mjs
 *
 * CI gate: ensures Zod entity DTO schemas in @afenda/contracts stay aligned
 * with Drizzle pgTable column definitions in @afenda/db.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. COLUMN_MISSING_FROM_CONTRACT — a DB column exists in a pgTable that is
 *     not represented in the corresponding Zod entity schema (and is not in
 *     the explicit exclusion list).
 *  2. FIELD_MISSING_FROM_DB — a Zod schema field exists in a contract entity
 *     that has no matching column in the corresponding pgTable (and is not
 *     in the explicit exclusion list).
 *
 * Pairs are configured in SYNC_PAIRS below. Add new entity↔table mappings
 * as the domain grows.
 *
 * Usage:
 *   node tools/gates/contract-db-sync.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

/**
 * Each pair maps ONE Drizzle pgTable to ONE Zod entity schema.
 *
 * - dbFile / dbTable:           where to find the pgTable("sql_name", {...})
 * - contractFile / contractSchema: where to find the z.object({...})
 * - excludeFromContract:        DB columns intentionally absent from the DTO
 *                               (e.g. passwordHash, orgId for implicit RLS)
 * - excludeFromDb:              contract fields not backed by a DB column
 *                               (e.g. computed fields, cross-table joins)
 *
 * ─── Exclusion rationale ─────────────────────────────────────────────────
 *
 * PartySchema   — externalKey (internal reconciliation), updatedAt (infra)
 * PrincipalSchema — passwordHash (security), updatedAt (infra)
 * PartyRoleSchema — updatedAt (infra, mutable tables have it but DTO is
 *                   read-model; include if consumers need optimistic locking)
 */
const SYNC_PAIRS = [
  // ─── Finance ─────────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/finance.ts",
    dbTable: "invoice",
    contractFile: "packages/contracts/src/invoice/invoice.entity.ts",
    contractSchema: "InvoiceSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/finance.ts",
    dbTable: "account",
    contractFile: "packages/contracts/src/gl/account.entity.ts",
    contractSchema: "AccountSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Supplier ────────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/supplier.ts",
    dbTable: "supplier",
    contractFile: "packages/contracts/src/supplier/supplier.entity.ts",
    contractSchema: "SupplierSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── IAM ─────────────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/iam.ts",
    dbTable: "party",
    contractFile: "packages/contracts/src/iam/party.entity.ts",
    contractSchema: "PartySchema",
    excludeFromContract: ["externalKey", "updatedAt"],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/iam.ts",
    dbTable: "person",
    contractFile: "packages/contracts/src/iam/party.entity.ts",
    contractSchema: "PersonSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/iam.ts",
    dbTable: "organization",
    contractFile: "packages/contracts/src/iam/party.entity.ts",
    contractSchema: "OrganizationSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/iam.ts",
    dbTable: "iam_principal",
    contractFile: "packages/contracts/src/iam/principal.entity.ts",
    contractSchema: "PrincipalSchema",
    excludeFromContract: ["passwordHash", "updatedAt"],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/iam.ts",
    dbTable: "party_role",
    contractFile: "packages/contracts/src/iam/membership.entity.ts",
    contractSchema: "PartyRoleSchema",
    excludeFromContract: ["updatedAt"],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/iam.ts",
    dbTable: "membership",
    contractFile: "packages/contracts/src/iam/membership.entity.ts",
    contractSchema: "MembershipSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Document / Evidence ─────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/document.ts",
    dbTable: "document",
    contractFile: "packages/contracts/src/evidence/evidence.entity.ts",
    contractSchema: "DocumentSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  // EvidenceLinkSchema uses z.intersection() — too complex for regex
  // parsing. Covered by manual review and evidence.commands.ts tests.
];

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  COLUMN_MISSING_FROM_CONTRACT: {
    why: "A DB column without a matching Zod field means the API never returns that data. This is usually accidental — if intentional, add the column to excludeFromContract.",
    docs: "See packages/contracts/OWNERS.md §1 — Truth Boundary",
  },
  FIELD_MISSING_FROM_DB: {
    why: "A Zod field without a matching DB column means the contract promises data that doesn't exist. This is usually accidental — if intentional, add the field to excludeFromDb.",
    docs: "See packages/contracts/OWNERS.md §1 — Truth Boundary",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "COLUMN_MISSING_FROM_CONTRACT":
      return `Add "${ctx.field}" to ${ctx.contractSchema} in ${ctx.contractFile}, or add it to excludeFromContract in tools/gates/contract-db-sync.mjs with a comment explaining why.`;
    case "FIELD_MISSING_FROM_DB":
      return `Add a "${ctx.field}" column to the "${ctx.dbTable}" table in ${ctx.dbFile}, or add it to excludeFromDb in tools/gates/contract-db-sync.mjs with a comment explaining why.`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Parsing Helpers ─────────────────────────────────────────────────────────

/**
 * Extract camelCase field names from a Drizzle pgTable() column-definition
 * object for a given SQL table name.
 *
 * Matches: export const <var> = pgTable("<sqlName>", { fieldName: type(... })
 *
 * @param {string} content  — file source code
 * @param {string} sqlName  — the SQL table name (first arg to pgTable)
 * @returns {string[] | null} — field names, or null if table not found
 */
function extractTableFields(content, sqlName) {
  // Find the pgTable declaration for this SQL name
  const tableRe = new RegExp(
    `export\\s+const\\s+\\w+\\s*=\\s*pgTable\\(\\s*\\n?\\s*"${sqlName}"\\s*,\\s*\\{`,
  );
  const m = content.match(tableRe);
  if (!m) return null;

  // Walk from after the opening { to the matching }
  const startIdx = m.index + m[0].length;
  let depth = 1;
  let i = startIdx;
  for (; i < content.length && depth > 0; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") depth--;
  }
  const body = content.substring(startIdx, i - 1);

  // Extract field names from lines matching: fieldName: type(...
  const fields = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    const fm = trimmed.match(/^(\w+)\s*:/);
    if (fm) fields.push(fm[1]);
  }
  return fields;
}

/**
 * Extract field names from a Zod z.object({...}) schema definition.
 *
 * Matches: export const SchemaName = z.object({ fieldName: ... })
 *
 * @param {string} content     — file source code
 * @param {string} schemaName  — the exported const name
 * @returns {string[] | null}  — field names, or null if schema not found
 */
function extractZodFields(content, schemaName) {
  const schemaRe = new RegExp(
    `export\\s+const\\s+${schemaName}\\s*=\\s*z\\.object\\(\\s*\\{`,
  );
  const m = content.match(schemaRe);
  if (!m) return null;

  const startIdx = m.index + m[0].length;
  let depth = 1;
  let i = startIdx;
  for (; i < content.length && depth > 0; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") depth--;
  }
  const body = content.substring(startIdx, i - 1);

  const fields = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    const fm = trimmed.match(/^(\w+)\s*:/);
    if (fm) fields.push(fm[1]);
  }
  return fields;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
let pairCount = 0;

for (const pair of SYNC_PAIRS) {
  const dbAbs = resolve(ROOT, pair.dbFile);
  const contractAbs = resolve(ROOT, pair.contractFile);

  if (!existsSync(dbAbs)) {
    console.error(`WARNING: DB file not found: ${pair.dbFile} — skipping pair`);
    continue;
  }
  if (!existsSync(contractAbs)) {
    console.error(`WARNING: Contract file not found: ${pair.contractFile} — skipping pair`);
    continue;
  }

  pairCount++;
  const dbContent = readFileSync(dbAbs, "utf-8");
  const contractContent = readFileSync(contractAbs, "utf-8");

  const dbFields = extractTableFields(dbContent, pair.dbTable);
  if (!dbFields) {
    console.error(`WARNING: Could not find pgTable("${pair.dbTable}") in ${pair.dbFile} — skipping`);
    continue;
  }

  const contractFields = extractZodFields(contractContent, pair.contractSchema);
  if (!contractFields) {
    console.error(`WARNING: Could not find ${pair.contractSchema} = z.object() in ${pair.contractFile} — skipping`);
    continue;
  }

  const dbSet = new Set(dbFields);
  const contractSet = new Set(contractFields);
  const excludeContract = new Set(pair.excludeFromContract);
  const excludeDb = new Set(pair.excludeFromDb);

  // ── Rule 1: columns in DB but missing from contract ──────────────────
  for (const field of dbFields) {
    if (contractSet.has(field)) continue;
    if (excludeContract.has(field)) continue;

    violations.push({
      ruleCode: "COLUMN_MISSING_FROM_CONTRACT",
      file: pair.contractFile,
      line: null,
      message: `DB column "${field}" in pgTable("${pair.dbTable}") has no matching field in ${pair.contractSchema}`,
      fix: suggestFix("COLUMN_MISSING_FROM_CONTRACT", {
        field,
        dbTable: pair.dbTable,
        contractSchema: pair.contractSchema,
        contractFile: pair.contractFile,
      }),
    });
  }

  // ── Rule 2: fields in contract but missing from DB ───────────────────
  for (const field of contractFields) {
    if (dbSet.has(field)) continue;
    if (excludeDb.has(field)) continue;

    violations.push({
      ruleCode: "FIELD_MISSING_FROM_DB",
      file: pair.dbFile,
      line: null,
      message: `Contract field "${field}" in ${pair.contractSchema} has no matching column in pgTable("${pair.dbTable}")`,
      fix: suggestFix("FIELD_MISSING_FROM_DB", {
        field,
        dbTable: pair.dbTable,
        contractSchema: pair.contractSchema,
        dbFile: pair.dbFile,
      }),
    });
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  reportViolations({
    gateName: "CONTRACT ↔ DB SYNC",
    violations,
    ruleDocs: RULE_DOCS,
    stats: { "Entity pairs checked:": pairCount },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "contract-db-sync check",
    detail: `${pairCount} entity ↔ table pairs verified in ${elapsed}s`,
  });
}
