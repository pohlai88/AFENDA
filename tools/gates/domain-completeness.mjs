#!/usr/bin/env node
/**
 * tools/gates/domain-completeness.mjs
 *
 * CI gate: ensures every domain entity has all required registrations.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. SYNC_PAIR_MISSING     — a pgTable in @afenda/db has no corresponding
 *                              entry in contract-db-sync.mjs SYNC_PAIRS.
 *  2. ERROR_CODE_MISSING    — a domain dir under contracts/src/ has no
 *                              error codes with the domain prefix in errors.ts.
 *  3. AUDIT_ACTION_MISSING  — a domain dir under contracts/src/ has no
 *                              audit actions in audit.ts.
 *  4. PERMISSION_MISSING    — a domain dir under contracts/src/ has no
 *                              permission entries in permissions.ts.
 *  5. OUTBOX_EVENT_MISSING  — a core service emits outbox events but the
 *                              event type is not referenced in a worker handler.
 *
 * Usage:
 *   node tools/gates/domain-completeness.mjs
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

/**
 * Infra tables that are NOT domain entities and do NOT need sync pairs,
 * error codes, audit actions, or permissions.
 */
const INFRA_TABLES = new Set([
  "outbox_event",
  "idempotency",
  "audit_log",
  "sequence",
  "dead_letter_job",
  // Join/lookup tables that are internal wiring
  "iam_permission",
  "iam_role_permission",
  "iam_principal_role",
  // Append-only history tables (covered by their parent entity pair)
  "invoice_status_history",
  "evidence_operation",
  // Sub-tables covered by their parent entity's sync pair
  "journal_line",
]);

/**
 * Domain directory → error code prefix mapping.
 * Keys are directory names under packages/contracts/src/.
 * Values are the expected SCREAMING_SNAKE prefix in ErrorCodeValues.
 */
const DOMAIN_ERROR_PREFIX = {
  invoice: "AP_",
  gl: "GL_",
  supplier: "SUP_",
  evidence: "DOC_",
  iam: "IAM_",
};

/**
 * Domain directory → audit action prefix mapping.
 * Values are dot-delimited scope prefixes in AuditActionValues.
 */
const DOMAIN_AUDIT_PREFIX = {
  invoice: "invoice.",
  gl: "gl.",
  supplier: "supplier.",
  evidence: ["document.", "evidence."],
  iam: "iam.",
};

/**
 * Domain directory → permission scope prefix.
 * Values are the scope prefix in PermissionValues.
 */
const DOMAIN_PERMISSION_PREFIX = {
  invoice: "ap.",
  gl: "gl.",
  supplier: "sup.",
  evidence: "doc.",
  iam: "iam.",
};

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  SYNC_PAIR_MISSING: {
    why: "Without a sync pair in contract-db-sync.mjs, the contract↔DB column parity gate cannot detect schema drift for this table. The gate passes vacuously.",
    docs: "See tools/gates/contract-db-sync.mjs — SYNC_PAIRS configuration",
  },
  ERROR_CODE_MISSING: {
    why: "Every domain must register at least one error code so API consumers can switch on structured error codes instead of parsing messages.",
    docs: "See packages/contracts/src/shared/errors.ts — ErrorCodeValues",
  },
  AUDIT_ACTION_MISSING: {
    why: "Every domain with mutations must register audit actions for compliance traceability.",
    docs: "See packages/contracts/src/shared/audit.ts — AuditActionValues",
  },
  PERMISSION_MISSING: {
    why: "Every domain exposed via API must register permissions for RBAC enforcement.",
    docs: "See packages/contracts/src/shared/permissions.ts — PermissionValues",
  },
  OUTBOX_EVENT_MISSING: {
    why: "Outbox events emitted in core services should have a corresponding worker handler to process them. Unhandled events accumulate in the outbox table forever.",
    docs: "See apps/worker/src/jobs/ — worker handler convention",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "SYNC_PAIR_MISSING":
      return `Add a sync pair entry to SYNC_PAIRS in tools/gates/contract-db-sync.mjs:\n    { dbFile: "${ctx.dbFile}", dbTable: "${ctx.table}", contractFile: "packages/contracts/src/<domain>/<entity>.entity.ts", contractSchema: "<Entity>Schema" }`;
    case "ERROR_CODE_MISSING":
      return `Add at least one error code with prefix "${ctx.prefix}" to ErrorCodeValues in packages/contracts/src/shared/errors.ts (e.g. "${ctx.prefix}${ctx.domain.toUpperCase()}_NOT_FOUND").`;
    case "AUDIT_ACTION_MISSING":
      return `Add at least one audit action with prefix "${ctx.prefix}" to AuditActionValues in packages/contracts/src/shared/audit.ts (e.g. "${ctx.prefix}created").`;
    case "PERMISSION_MISSING":
      return `Add at least one permission with prefix "${ctx.prefix}" to PermissionValues in packages/contracts/src/shared/permissions.ts (e.g. "${ctx.prefix}${ctx.domain}.read").`;
    case "OUTBOX_EVENT_MISSING":
      return `Create a worker handler in apps/worker/src/jobs/handle-<event>.ts for event type "${ctx.event}", or register the handler in apps/worker/src/index.ts.`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the SYNC_PAIRS array entries from contract-db-sync.mjs.
 * Returns a Set of dbTable names that are configured.
 */
function extractConfiguredSyncTables() {
  const syncFile = resolve(ROOT, "tools/gates/contract-db-sync.mjs");
  if (!existsSync(syncFile)) return new Set();

  const content = readFileSync(syncFile, "utf-8");
  const tables = new Set();

  // Match dbTable: "table_name" in SYNC_PAIRS
  const re = /dbTable:\s*"(\w+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    tables.add(m[1]);
  }
  return tables;
}

/**
 * Extract all pgTable SQL names from DB schema files.
 * Returns array of { table, dbFile, varName }.
 */
function extractAllDbTables() {
  const schemaDir = resolve(ROOT, "packages/db/src/schema");
  const tables = [];
  const schemaFiles = ["iam.ts", "finance.ts", "document.ts", "supplier.ts"];

  for (const fileName of schemaFiles) {
    const filePath = resolve(schemaDir, fileName);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, "utf-8");
    const relFile = `packages/db/src/schema/${fileName}`;
    const re = /export\s+const\s+(\w+)\s*=\s*pgTable\(\s*\n?\s*"(\w+)"/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      tables.push({ varName: m[1], table: m[2], dbFile: relFile });
    }
  }
  return tables;
}

/**
 * List domain directories under packages/contracts/src/.
 * Excludes "shared" and "meta" which are cross-cutting.
 */
function listDomainDirs() {
  const contractsDir = resolve(ROOT, "packages/contracts/src");
  if (!existsSync(contractsDir)) return [];

  return readdirSync(contractsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !["shared", "meta"].includes(e.name))
    .map((e) => e.name);
}

/**
 * Extract outbox event types emitted in core services.
 * Looks for type: "AP.INVOICE_SUBMITTED" patterns inside outbox insert calls.
 */
function extractEmittedOutboxEvents() {
  const coreDir = resolve(ROOT, "packages/core/src");
  if (!existsSync(coreDir)) return [];

  const events = [];
  const files = walkTs(coreDir);

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const relFile = relative(ROOT, file).split(sep).join("/");

    // Match type: "AP.INVOICE_SUBMITTED" patterns
    const re = /type:\s*"([A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9_]*)+)"/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      events.push({ type: m[1], file: relFile });
    }
  }
  return events;
}

/**
 * Extract handled event types from worker handler files.
 */
function extractHandledOutboxEvents() {
  const workerDir = resolve(ROOT, "apps/worker/src/jobs");
  if (!existsSync(workerDir)) return new Set();

  const handled = new Set();
  const entries = readdirSync(workerDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const content = readFileSync(join(workerDir, entry.name), "utf-8");

    // Match event type strings
    const re = /"([A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9_]*)+)"/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      handled.add(m[1]);
    }
  }
  return handled;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];

// ── Load shared registries ─────────────────────────────────────────────────

const errorsFile = resolve(ROOT, "packages/contracts/src/shared/errors.ts");
const auditFile = resolve(ROOT, "packages/contracts/src/shared/audit.ts");
const permissionsFile = resolve(ROOT, "packages/contracts/src/shared/permissions.ts");

const errorsContent = existsSync(errorsFile) ? readFileSync(errorsFile, "utf-8") : "";
const auditContent = existsSync(auditFile) ? readFileSync(auditFile, "utf-8") : "";
const permContent = existsSync(permissionsFile) ? readFileSync(permissionsFile, "utf-8") : "";

// ── Rule 1: SYNC_PAIR_MISSING ──────────────────────────────────────────────

const configuredSyncTables = extractConfiguredSyncTables();
const allDbTables = extractAllDbTables();
let syncPairChecked = 0;

for (const { table, dbFile, varName } of allDbTables) {
  if (INFRA_TABLES.has(table)) continue;
  syncPairChecked++;

  if (!configuredSyncTables.has(table)) {
    violations.push({
      ruleCode: "SYNC_PAIR_MISSING",
      file: dbFile,
      line: null,
      message: `pgTable("${table}") (${varName}) has no sync pair in contract-db-sync.mjs — contract↔DB parity is not being checked`,
      fix: suggestFix("SYNC_PAIR_MISSING", { table, dbFile }),
    });
  }
}

// ── Rules 2-4: Domain registry completeness ────────────────────────────────

const domainDirs = listDomainDirs();
let domainChecked = 0;

for (const domain of domainDirs) {
  domainChecked++;

  // Check if there are any .ts files (beyond index.ts) — skip empty/stub domains
  const domainDir = resolve(ROOT, "packages/contracts/src", domain);
  const domainFiles = readdirSync(domainDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".ts") && e.name !== "index.ts");
  if (domainFiles.length === 0) continue;

  // ── Rule 2: ERROR_CODE_MISSING ───────────────────────────────────────
  const errorPrefix = DOMAIN_ERROR_PREFIX[domain];
  if (errorPrefix && !errorsContent.includes(`"${errorPrefix}`)) {
    violations.push({
      ruleCode: "ERROR_CODE_MISSING",
      file: `packages/contracts/src/${domain}/`,
      line: null,
      message: `Domain "${domain}" has no error codes with prefix "${errorPrefix}" in errors.ts`,
      fix: suggestFix("ERROR_CODE_MISSING", { prefix: errorPrefix, domain }),
    });
  }

  // ── Rule 3: AUDIT_ACTION_MISSING ─────────────────────────────────────
  const auditPrefix = DOMAIN_AUDIT_PREFIX[domain];
  if (auditPrefix) {
    const prefixes = Array.isArray(auditPrefix) ? auditPrefix : [auditPrefix];
    const hasAudit = prefixes.some((p) => auditContent.includes(`"${p}`));
    if (!hasAudit) {
      violations.push({
        ruleCode: "AUDIT_ACTION_MISSING",
        file: `packages/contracts/src/${domain}/`,
        line: null,
        message: `Domain "${domain}" has no audit actions with prefix "${prefixes.join('" or "')}" in audit.ts`,
        fix: suggestFix("AUDIT_ACTION_MISSING", { prefix: prefixes[0], domain }),
      });
    }
  }

  // ── Rule 4: PERMISSION_MISSING ───────────────────────────────────────
  const permPrefix = DOMAIN_PERMISSION_PREFIX[domain];
  if (permPrefix && !permContent.includes(`"${permPrefix}`)) {
    violations.push({
      ruleCode: "PERMISSION_MISSING",
      file: `packages/contracts/src/${domain}/`,
      line: null,
      message: `Domain "${domain}" has no permissions with prefix "${permPrefix}" in permissions.ts`,
      fix: suggestFix("PERMISSION_MISSING", { prefix: permPrefix, domain }),
    });
  }
}

// ── Rule 5: OUTBOX_EVENT_MISSING ───────────────────────────────────────────

const emittedEvents = extractEmittedOutboxEvents();
const handledEvents = extractHandledOutboxEvents();
let outboxChecked = 0;

for (const { type, file } of emittedEvents) {
  outboxChecked++;
  if (!handledEvents.has(type)) {
    violations.push({
      ruleCode: "OUTBOX_EVENT_MISSING",
      file,
      line: null,
      message: `Outbox event "${type}" is emitted but no worker handler references it`,
      fix: suggestFix("OUTBOX_EVENT_MISSING", { event: type }),
    });
  }
}

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

// ── Report ──────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  reportViolations({
    gateName: "DOMAIN COMPLETENESS",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "DB tables checked:": syncPairChecked,
      "Domains checked:": domainChecked,
      "Outbox events checked:": outboxChecked,
      "Configured sync pairs:": configuredSyncTables.size,
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "domain-completeness check",
    detail: `${syncPairChecked} tables · ${domainChecked} domains · ${outboxChecked} outbox events · ${configuredSyncTables.size} sync pairs verified in ${elapsed}s`,
  });
}
