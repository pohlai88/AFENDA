#!/usr/bin/env node
/**
 * tools/scaffold-phase1.mjs — Phase 1: Create directory skeleton + barrels.
 *
 * Creates the target pillar/module directory tree from ADR-0005 and places
 * empty barrel index.ts files at each pillar and module level.
 *
 * Idempotent — skips files that already exist.
 * Run once as `node tools/scaffold-phase1.mjs`, then commit.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const BARREL = `// Phase 1 skeleton — populated during migration\nexport {};\n`;

// ─── Barrel directories: get dir + index.ts ──────────────────────────────────

const BARREL_DIRS = [
  // ── packages/contracts/src ─────────────────────────────────────────────────
  // kernel
  "packages/contracts/src/kernel",
  "packages/contracts/src/kernel/identity",
  "packages/contracts/src/kernel/governance",
  "packages/contracts/src/kernel/governance/audit",
  "packages/contracts/src/kernel/governance/evidence",
  "packages/contracts/src/kernel/governance/policy",
  "packages/contracts/src/kernel/governance/settings",
  "packages/contracts/src/kernel/execution",
  "packages/contracts/src/kernel/execution/outbox",
  "packages/contracts/src/kernel/execution/idempotency",
  "packages/contracts/src/kernel/execution/numbering",
  "packages/contracts/src/kernel/registry",
  // erp
  "packages/contracts/src/erp",
  "packages/contracts/src/erp/finance",
  "packages/contracts/src/erp/finance/gl",
  "packages/contracts/src/erp/finance/ap",
  "packages/contracts/src/erp/finance/ar",
  "packages/contracts/src/erp/finance/treasury",
  "packages/contracts/src/erp/finance/tax",
  "packages/contracts/src/erp/finance/fiscal",
  "packages/contracts/src/erp/finance/fx",
  "packages/contracts/src/erp/finance/assets",
  "packages/contracts/src/erp/finance/lease",
  "packages/contracts/src/erp/finance/costing",
  "packages/contracts/src/erp/finance/consolidation",
  "packages/contracts/src/erp/finance/intercompany",
  "packages/contracts/src/erp/finance/reporting",
  "packages/contracts/src/erp/supplier",
  "packages/contracts/src/erp/purchasing",
  "packages/contracts/src/erp/sales",
  "packages/contracts/src/erp/inventory",
  "packages/contracts/src/erp/crm",
  "packages/contracts/src/erp/hr",
  "packages/contracts/src/erp/project",
  "packages/contracts/src/erp/manufacturing",
  // comm
  "packages/contracts/src/comm",
  "packages/contracts/src/comm/notification",
  "packages/contracts/src/comm/inbox",
  "packages/contracts/src/comm/email",
  "packages/contracts/src/comm/sms",
  "packages/contracts/src/comm/chatter",
  "packages/contracts/src/comm/webhook",

  // ── packages/db/src/schema ─────────────────────────────────────────────────
  "packages/db/src/schema/kernel",
  "packages/db/src/schema/erp",
  "packages/db/src/schema/erp/finance",
  "packages/db/src/schema/comm",

  // ── packages/core/src ──────────────────────────────────────────────────────
  // kernel
  "packages/core/src/kernel",
  "packages/core/src/kernel/identity",
  "packages/core/src/kernel/governance",
  "packages/core/src/kernel/governance/audit",
  "packages/core/src/kernel/governance/evidence",
  "packages/core/src/kernel/governance/policy",
  "packages/core/src/kernel/governance/settings",
  "packages/core/src/kernel/execution",
  "packages/core/src/kernel/execution/outbox",
  "packages/core/src/kernel/execution/idempotency",
  "packages/core/src/kernel/execution/numbering",
  "packages/core/src/kernel/registry",
  // erp
  "packages/core/src/erp",
  "packages/core/src/erp/finance",
  "packages/core/src/erp/finance/money",
  "packages/core/src/erp/finance/gl",
  "packages/core/src/erp/finance/ap",
  "packages/core/src/erp/finance/ar",
  "packages/core/src/erp/finance/treasury",
  "packages/core/src/erp/finance/tax",
  "packages/core/src/erp/finance/fiscal",
  "packages/core/src/erp/finance/assets",
  "packages/core/src/erp/finance/lease",
  "packages/core/src/erp/finance/costing",
  "packages/core/src/erp/finance/consolidation",
  "packages/core/src/erp/finance/intercompany",
  "packages/core/src/erp/finance/reporting",
  "packages/core/src/erp/supplier",
  "packages/core/src/erp/purchasing",
  "packages/core/src/erp/sales",
  "packages/core/src/erp/inventory",
  "packages/core/src/erp/crm",
  "packages/core/src/erp/hr",
  "packages/core/src/erp/project",
  "packages/core/src/erp/manufacturing",
  // comm
  "packages/core/src/comm",
  "packages/core/src/comm/notification",
  "packages/core/src/comm/inbox",
  "packages/core/src/comm/email",
  "packages/core/src/comm/sms",
  "packages/core/src/comm/chatter",
  "packages/core/src/comm/webhook",
];

// ─── Directories without barrels (organizational only) ───────────────────────

const DIR_ONLY = [
  // api routes — pillar + module dirs
  "apps/api/src/routes/kernel",
  "apps/api/src/routes/erp",
  "apps/api/src/routes/erp/finance",
  "apps/api/src/routes/comm",

  // worker jobs — pillar + module dirs
  "apps/worker/src/jobs/kernel",
  "apps/worker/src/jobs/erp",
  "apps/worker/src/jobs/erp/finance",
  "apps/worker/src/jobs/erp/finance/ap",
  "apps/worker/src/jobs/erp/finance/gl",
  "apps/worker/src/jobs/comm",
  "apps/worker/src/jobs/comm/notification",
  "apps/worker/src/jobs/comm/email",
  "apps/worker/src/jobs/comm/webhook",

  // web route groups (organizational — no page files yet)
  "apps/web/src/app/(kernel)",
  "apps/web/src/app/(kernel)/governance",
  "apps/web/src/app/(erp)",
  "apps/web/src/app/(erp)/finance",
  "apps/web/src/app/(erp)/finance/ap",
  "apps/web/src/app/(erp)/finance/gl",
  "apps/web/src/app/(erp)/finance/treasury",
  "apps/web/src/app/(erp)/finance/reporting",
  "apps/web/src/app/(erp)/suppliers",
  "apps/web/src/app/(erp)/purchasing",
  "apps/web/src/app/(erp)/sales",
  "apps/web/src/app/(erp)/inventory",
  "apps/web/src/app/(erp)/crm",
  "apps/web/src/app/(erp)/hr",
  "apps/web/src/app/(erp)/project",
  "apps/web/src/app/(comm)",
  "apps/web/src/app/(comm)/inbox",
  "apps/web/src/app/(comm)/notifications",
  "apps/web/src/app/(comm)/chatter",
];

// ─── Execute ─────────────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

// Create barrel directories with index.ts
for (const dir of BARREL_DIRS) {
  const absDir = resolve(ROOT, dir);
  mkdirSync(absDir, { recursive: true });

  const barrel = resolve(absDir, "index.ts");
  if (!existsSync(barrel)) {
    writeFileSync(barrel, BARREL);
    created++;
  } else {
    skipped++;
  }
}

// Create dir-only directories — use .gitkeep to ensure Git tracks them
for (const dir of DIR_ONLY) {
  const absDir = resolve(ROOT, dir);
  mkdirSync(absDir, { recursive: true });

  const gitkeep = resolve(absDir, ".gitkeep");
  if (!existsSync(gitkeep)) {
    // Only create .gitkeep if the directory is empty (no other files)
    const barrel = resolve(absDir, "index.ts");
    if (!existsSync(barrel)) {
      writeFileSync(gitkeep, "");
      created++;
    }
  }
}

console.log(`Phase 1 scaffold complete: ${created} files created, ${skipped} skipped (already exist).`);
