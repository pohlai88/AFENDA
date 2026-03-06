#!/usr/bin/env node
// tools/scaffold.mjs — Generate a new domain entity from templates
// Usage: node tools/scaffold.mjs <domain> <entity>
// Example: node tools/scaffold.mjs procurement purchase-order

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

// ── Args ──────────────────────────────────────────────────────────────────────
const [domain, entityKebab] = process.argv.slice(2);

if (!domain || !entityKebab) {
  console.error("Usage: node tools/scaffold.mjs <domain> <entity-kebab>");
  console.error("Example: node tools/scaffold.mjs procurement purchase-order");
  process.exit(1);
}

// ── Naming transforms ─────────────────────────────────────────────────────────
const kebab = entityKebab; // purchase-order
const snake = kebab.replace(/-/g, "_"); // purchase_order
const camel = kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); // purchaseOrder
const pascal = camel.charAt(0).toUpperCase() + camel.slice(1); // PurchaseOrder
const upper = snake.toUpperCase(); // PURCHASE_ORDER
const domainUpper = domain.toUpperCase(); // PROCUREMENT

const replacements = [
  // Template placeholders → real values
  // Templates use literal "Entity" as the placeholder (PascalCase)
  [/\bEntityStatus/g, `${pascal}Status`],
  [/\bEntitySchema\b/g, `${pascal}Schema`],
  [/\bEntityIdSchema\b/g, `${pascal}IdSchema`],
  [/\bCreateEntityCommandSchema\b/g, `Create${pascal}CommandSchema`],
  [/\bCreateEntityCommand\b(?!Schema)/g, `Create${pascal}Command`],
  [/\bUpdateEntityCommandSchema\b/g, `Update${pascal}CommandSchema`],
  [/\bEntity\b(?!Id)/g, pascal],
  [/<domain>/g, domain],
  [/<entity>/g, kebab],
];

function applyReplacements(content) {
  let result = content;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ── File generation plan ──────────────────────────────────────────────────────
const plan = [
  {
    template: "templates/entity.contract.template.ts",
    target: `packages/contracts/src/${domain}/${kebab}.entity.ts`,
    label: "Contract: Entity schema",
  },
  {
    template: "templates/commands.contract.template.ts",
    target: `packages/contracts/src/${domain}/${kebab}.commands.ts`,
    label: "Contract: Command schemas",
  },
  {
    template: "templates/OWNERS.template.md",
    target: `packages/contracts/src/${domain}/OWNERS.md`,
    label: "Contract: OWNERS.md",
  },
  {
    template: "templates/service.template.ts",
    target: `packages/core/src/${domain}/${kebab}.service.ts`,
    label: "Core: Domain service",
  },
  {
    template: "templates/queries.template.ts",
    target: `packages/core/src/${domain}/${kebab}.queries.ts`,
    label: "Core: Query functions",
  },
  {
    template: "templates/OWNERS.template.md",
    target: `packages/core/src/${domain}/OWNERS.md`,
    label: "Core: OWNERS.md",
  },
  {
    template: "templates/route.template.ts",
    target: `apps/api/src/routes/${kebab}.ts`,
    label: "API: Route handler",
  },
  {
    template: "templates/worker-handler.template.ts",
    target: `apps/worker/src/jobs/handle-${kebab}.ts`,
    label: "Worker: Event handler",
  },
];

// ── Generate files ────────────────────────────────────────────────────────────
const created = [];
const skipped = [];

for (const entry of plan) {
  const targetPath = join(ROOT, entry.target);
  if (existsSync(targetPath)) {
    skipped.push(entry);
    continue;
  }

  const templatePath = join(ROOT, entry.template);
  if (!existsSync(templatePath)) {
    console.error(`  ✗ Template not found: ${entry.template}`);
    continue;
  }

  const content = readFileSync(templatePath, "utf-8");
  const output = applyReplacements(content);

  mkdirSync(resolve(targetPath, ".."), { recursive: true });
  writeFileSync(targetPath, output, "utf-8");
  created.push(entry);
}

// ── Generate barrel indexes ───────────────────────────────────────────────────
const barrels = [
  {
    path: `packages/contracts/src/${domain}/index.ts`,
    exports: [
      `export * from "./${kebab}.entity.js";`,
      `export * from "./${kebab}.commands.js";`,
    ],
  },
  {
    path: `packages/core/src/${domain}/index.ts`,
    exports: [
      `export * from "./${kebab}.service.js";`,
      `export * from "./${kebab}.queries.js";`,
    ],
  },
];

for (const barrel of barrels) {
  const barrelPath = join(ROOT, barrel.path);
  if (!existsSync(barrelPath)) {
    mkdirSync(resolve(barrelPath, ".."), { recursive: true });
    writeFileSync(barrelPath, barrel.exports.join("\n") + "\n", "utf-8");
    created.push({ target: barrel.path, label: "Barrel index" });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log();
console.log(`✔  Scaffolded domain: ${domain} / ${pascal}`);
console.log();

if (created.length > 0) {
  console.log("Created files:");
  for (const f of created) {
    console.log(`  ✓ ${f.target}  (${f.label})`);
  }
}

if (skipped.length > 0) {
  console.log();
  console.log("Skipped (already exist):");
  for (const f of skipped) {
    console.log(`  ⊘ ${f.target}`);
  }
}

// ── Manual checklist ──────────────────────────────────────────────────────────
console.log();
console.log("═══════════════════════════════════════════════════════");
console.log("  MANUAL STEPS REMAINING (schema-is-truth §12.4)");
console.log("═══════════════════════════════════════════════════════");
console.log();
console.log(`  □  1. Finalize Zod schemas in contracts/${domain}/${kebab}.entity.ts`);
console.log(`  □  2. Finalize command schemas in contracts/${domain}/${kebab}.commands.ts`);
console.log(`  □  3. Write Drizzle pgTable in packages/db/src/schema/${domain}.ts`);
console.log(`       - Import ${pascal}StatusValues from @afenda/contracts`);
console.log(`       - Add pgEnum, create table with org-scoped unique`);
console.log(`       - Index all FKs, add rlsOrg, use tsz() for timestamps`);
console.log(`  □  4. Generate SQL migration: pnpm db:generate`);
console.log(`  □  5. Add error codes to packages/contracts/src/shared/errors.ts`);
console.log(`       - Pattern: ${domainUpper}_${upper}_NOT_FOUND, etc.`);
console.log(`  □  6. Add audit actions to packages/contracts/src/shared/audit.ts`);
console.log(`       - Pattern: ${domain}.${camel}.created, ${domain}.${camel}.updated, etc.`);
console.log(`  □  7. Add permissions to packages/contracts/src/shared/permissions.ts`);
console.log(`       - Pattern: ${domain}.${camel}.create, ${domain}.${camel}.approve, etc.`);
console.log(`  □  8. Add outbox event types to packages/contracts/src/shared/outbox.ts`);
console.log(`       - Pattern: ${domainUpper}.${upper}_CREATED, etc.`);
console.log(`  □  9. Add sync pair to tools/gates/contract-db-sync.mjs`);
console.log(`       - { table: "${snake}", schema: "${pascal}Schema" }`);
console.log(`  □ 10. Wire barrel re-export in packages/contracts/src/index.ts`);
console.log(`  □ 11. Wire barrel re-export in packages/core/src/index.ts`);
console.log(`  □ 12. Register route in apps/api/src/index.ts`);
console.log(`  □ 13. Register worker handler in apps/worker/src/index.ts`);
console.log(`  □ 14. Update OWNERS.md files with actual exports and descriptions`);
console.log(`  □ 15. Write tests in packages/core/src/${domain}/__vitest_test__/`);
console.log(`  □ 16. Run: pnpm typecheck && pnpm test && pnpm check:all`);
console.log();
