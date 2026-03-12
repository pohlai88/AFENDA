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
// ─── Intentional exclusions ───────────────────────────────────────────────────
//
// org_setting: excluded by design. value_json is intentionally polymorphic —
// one column carries all setting value types (string, number, boolean, array).
// A 1:1 sync pair would produce false COLUMN_MISSING_FROM_CONTRACT violations.
// Type safety is enforced by the per-key SETTING_VALUE_SCHEMAS registry in core,
// not by Zod-to-column mapping.
//
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_PAIRS = [
  // ─── Finance ─────────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "invoice",
    contractFile: "packages/contracts/src/erp/finance/ap/invoice.entity.ts",
    contractSchema: "InvoiceSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/gl.ts",
    dbTable: "account",
    contractFile: "packages/contracts/src/erp/finance/gl/account.entity.ts",
    contractSchema: "AccountSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Purchasing ──────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/purchasing.ts",
    dbTable: "purchase_order",
    contractFile: "packages/contracts/src/erp/purchasing/purchase-order.entity.ts",
    contractSchema: "PurchaseOrderSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/purchasing.ts",
    dbTable: "receipt",
    contractFile: "packages/contracts/src/erp/purchasing/receipt.entity.ts",
    contractSchema: "ReceiptSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Supplier ────────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/supplier.ts",
    dbTable: "supplier",
    contractFile: "packages/contracts/src/erp/supplier/supplier.entity.ts",
    contractSchema: "SupplierSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── IAM ─────────────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "party",
    contractFile: "packages/contracts/src/kernel/identity/party.entity.ts",
    contractSchema: "PartySchema",
    excludeFromContract: ["externalKey", "updatedAt"],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "person",
    contractFile: "packages/contracts/src/kernel/identity/party.entity.ts",
    contractSchema: "PersonSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "organization",
    contractFile: "packages/contracts/src/kernel/identity/party.entity.ts",
    contractSchema: "OrganizationSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "iam_principal",
    contractFile: "packages/contracts/src/kernel/identity/principal.entity.ts",
    contractSchema: "PrincipalSchema",
    excludeFromContract: ["passwordHash", "updatedAt"],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "party_role",
    contractFile: "packages/contracts/src/kernel/identity/membership.entity.ts",
    contractSchema: "PartyRoleSchema",
    excludeFromContract: ["updatedAt"],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "membership",
    contractFile: "packages/contracts/src/kernel/identity/membership.entity.ts",
    contractSchema: "MembershipSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "auth_password_reset_token",
    contractFile: "packages/contracts/src/kernel/identity/auth.entity.ts",
    contractSchema: "AuthPasswordResetTokenSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "auth_portal_invitation",
    contractFile: "packages/contracts/src/kernel/identity/auth.entity.ts",
    contractSchema: "AuthPortalInvitationSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── IAM (continued) ─────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/kernel/identity.ts",
    dbTable: "iam_role",
    contractFile: "packages/contracts/src/kernel/identity/role.entity.ts",
    contractSchema: "RoleSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Finance (continued) ─────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/finance/gl.ts",
    dbTable: "journal_entry",
    contractFile: "packages/contracts/src/erp/finance/gl/journal-entry.entity.ts",
    contractSchema: "JournalEntrySchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Custom Fields ────────────────────────────────────────────────────
  // custom_field_def: admin-managed field definitions (governance metadata).
  // CustomFieldDefSchema is the full entity mirror — includes orgId (unlike the
  // API response schema which strips orgId for RLS clarity).
  {
    dbFile: "packages/db/src/schema/kernel/governance/custom-fields.ts",
    dbTable: "custom_field_def",
    contractFile:
      "packages/contracts/src/kernel/governance/custom-fields/custom-field.entity.ts",
    contractSchema: "CustomFieldDefSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  // custom_field_value: per-entity-instance values (domain business data).
  {
    dbFile: "packages/db/src/schema/kernel/governance/custom-fields.ts",
    dbTable: "custom_field_value",
    contractFile:
      "packages/contracts/src/kernel/governance/custom-fields/custom-field.entity.ts",
    contractSchema: "CustomFieldValueSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Document / Evidence ─────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/kernel/governance/evidence.ts",
    dbTable: "document",
    contractFile: "packages/contracts/src/kernel/governance/evidence/evidence.entity.ts",
    contractSchema: "DocumentSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/kernel/governance/evidence.ts",
    dbTable: "evidence",
    contractFile: "packages/contracts/src/kernel/governance/evidence/evidence.entity.ts",
    contractSchema: "EvidenceLinkSchema",
    excludeFromContract: [],
    excludeFromDb: ["idempotencyKey"],
    // Fields from the intersected EvidenceTargetSchema discriminated union.
    // The parser extracts fields from the inline z.object({...}) block;
    // these are the additional fields contributed by the second operand.
    intersectionFields: ["entityType", "entityId"],
  },

  // ─── AP (Accounts Payable) ───────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "payment_terms",
    contractFile: "packages/contracts/src/erp/finance/ap/payment-terms.entity.ts",
    contractSchema: "PaymentTermsSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "ap_hold",
    contractFile: "packages/contracts/src/erp/finance/ap/hold.entity.ts",
    contractSchema: "ApHoldSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "invoice_line",
    contractFile: "packages/contracts/src/erp/finance/ap/invoice-line.entity.ts",
    contractSchema: "InvoiceLineSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "payment_run",
    contractFile: "packages/contracts/src/erp/finance/ap/payment-run.entity.ts",
    contractSchema: "PaymentRunSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "payment_run_item",
    contractFile: "packages/contracts/src/erp/finance/ap/payment-run-item.entity.ts",
    contractSchema: "PaymentRunItemSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "prepayment",
    contractFile: "packages/contracts/src/erp/finance/ap/prepayment.entity.ts",
    contractSchema: "PrepaymentSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "prepayment_application",
    contractFile: "packages/contracts/src/erp/finance/ap/prepayment.entity.ts",
    contractSchema: "PrepaymentApplicationSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "match_tolerance",
    contractFile: "packages/contracts/src/erp/finance/ap/match-tolerance.entity.ts",
    contractSchema: "MatchToleranceSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "wht_certificate",
    contractFile: "packages/contracts/src/erp/finance/ap/wht-certificate.entity.ts",
    contractSchema: "WhtCertificateSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/ap.ts",
    dbTable: "wht_exemption",
    contractFile: "packages/contracts/src/erp/finance/ap/wht-certificate.entity.ts",
    contractSchema: "WhtExemptionSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Supplier (continued) ────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/supplier.ts",
    dbTable: "supplier_site",
    contractFile: "packages/contracts/src/erp/supplier/supplier-site.entity.ts",
    contractSchema: "SupplierSiteSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/supplier.ts",
    dbTable: "supplier_bank_account",
    contractFile: "packages/contracts/src/erp/supplier/supplier-bank-account.entity.ts",
    contractSchema: "SupplierBankAccountSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },

  // ─── Treasury ─────────────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/bank-account.ts",
    dbTable: "bank_account",
    contractFile: "packages/contracts/src/erp/finance/treasury/bank-account.entity.ts",
    contractSchema: "BankAccountSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/bank-statement.ts",
    dbTable: "bank_statement",
    contractFile: "packages/contracts/src/erp/finance/treasury/bank-statement.entity.ts",
    contractSchema: "BankStatementSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/bank-statement.ts",
    dbTable: "bank_statement_line",
    contractFile: "packages/contracts/src/erp/finance/treasury/bank-statement.entity.ts",
    contractSchema: "BankStatementLineSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  // ─── Treasury Wave 2 ──────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/reconciliation-session.ts",
    dbTable: "treasury_reconciliation_session",
    contractFile: "packages/contracts/src/erp/finance/treasury/reconciliation-session.entity.ts",
    contractSchema: "ReconciliationSessionSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/reconciliation-session.ts",
    dbTable: "treasury_reconciliation_match",
    contractFile: "packages/contracts/src/erp/finance/treasury/reconciliation-session.entity.ts",
    contractSchema: "ReconciliationMatchSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/treasury-payment-instruction.ts",
    dbTable: "treasury_payment_instruction",
    contractFile: "packages/contracts/src/erp/finance/treasury/treasury-payment-instruction.entity.ts",
    contractSchema: "PaymentInstructionSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/treasury-payment-batch.ts",
    dbTable: "treasury_payment_batch",
    contractFile: "packages/contracts/src/erp/finance/treasury/treasury-payment-batch.entity.ts",
    contractSchema: "PaymentBatchSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/treasury-payment-batch-item.ts",
    dbTable: "treasury_payment_batch_item",
    contractFile: "packages/contracts/src/erp/finance/treasury/treasury-payment-batch.entity.ts",
    contractSchema: "PaymentBatchItemSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  // ─── Treasury Wave 3 ──────────────────────────────────────────────────
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/cash-position-snapshot.ts",
    dbTable: "cash_position_snapshot",
    contractFile: "packages/contracts/src/erp/finance/treasury/cash-position-snapshot.entity.ts",
    contractSchema: "CashPositionSnapshotSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/cash-position-snapshot.ts",
    dbTable: "cash_position_snapshot_line",
    contractFile: "packages/contracts/src/erp/finance/treasury/cash-position-snapshot.entity.ts",
    contractSchema: "CashPositionSnapshotLineSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/liquidity-scenario.ts",
    dbTable: "liquidity_scenario",
    contractFile: "packages/contracts/src/erp/finance/treasury/liquidity-scenario.entity.ts",
    contractSchema: "LiquidityScenarioSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/liquidity-forecast.ts",
    dbTable: "liquidity_forecast",
    contractFile: "packages/contracts/src/erp/finance/treasury/liquidity-forecast.entity.ts",
    contractSchema: "LiquidityForecastSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/liquidity-forecast.ts",
    dbTable: "liquidity_forecast_bucket",
    contractFile: "packages/contracts/src/erp/finance/treasury/liquidity-forecast.entity.ts",
    contractSchema: "LiquidityForecastBucketSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/forecast-variance.ts",
    dbTable: "forecast_variance",
    contractFile: "packages/contracts/src/erp/finance/treasury/forecast-variance.entity.ts",
    contractSchema: "ForecastVarianceSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/liquidity-source-feed.ts",
    dbTable: "liquidity_source_feed",
    contractFile: "packages/contracts/src/erp/finance/treasury/liquidity-source-feed.entity.ts",
    contractSchema: "LiquiditySourceFeedSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/liquidity-lineage.ts",
    dbTable: "cash_position_snapshot_lineage",
    contractFile: "packages/contracts/src/erp/finance/treasury/liquidity-lineage.entity.ts",
    contractSchema: "CashPositionSnapshotLineageSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
  {
    dbFile: "packages/db/src/schema/erp/finance/treasury/liquidity-lineage.ts",
    dbTable: "liquidity_forecast_bucket_lineage",
    contractFile: "packages/contracts/src/erp/finance/treasury/liquidity-lineage.entity.ts",
    contractSchema: "LiquidityForecastBucketLineageSchema",
    excludeFromContract: [],
    excludeFromDb: [],
  },
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
  // Skip known Drizzle FK/index config keys that appear inside nested objects
  const DRIZZLE_INTERNAL_KEYS = new Set(["onDelete", "onUpdate"]);
  const fields = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    const fm = trimmed.match(/^(\w+)\s*:/);
    if (fm && !DRIZZLE_INTERNAL_KEYS.has(fm[1])) fields.push(fm[1]);
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
function extractZodFields(content, schemaName, intersectionFields = []) {
  // Try z.object first
  const objectRe = new RegExp(`export\\s+const\\s+${schemaName}\\s*=\\s*z\\.object\\(\\s*\\{`);
  let m = content.match(objectRe);

  // Fall back to z.intersection(z.object({...}), ...)
  if (!m) {
    const interRe = new RegExp(
      `export\\s+const\\s+${schemaName}\\s*=\\s*z\\.intersection\\(\\s*\\n?\\s*z\\.object\\(\\s*\\{`,
    );
    m = content.match(interRe);
  }

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

  // Append fields contributed by intersected schemas (declared in sync pair config)
  fields.push(...intersectionFields);

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
    console.error(
      `WARNING: Could not find pgTable("${pair.dbTable}") in ${pair.dbFile} — skipping`,
    );
    continue;
  }

  const contractFields = extractZodFields(
    contractContent,
    pair.contractSchema,
    pair.intersectionFields,
  );
  if (!contractFields) {
    console.error(
      `WARNING: Could not find ${pair.contractSchema} = z.object() or z.intersection() in ${pair.contractFile} — skipping`,
    );
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
      statement: `DB columns: [${dbFields.join(", ")}]  |  Contract fields: [${contractFields.join(", ")}]`,
      field,
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
      statement: `Contract fields: [${contractFields.join(", ")}]  |  DB columns: [${dbFields.join(", ")}]`,
      field,
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
