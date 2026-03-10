#!/usr/bin/env node
/**
 * tools/run-gates.mjs — Unified runner for all CI gate scripts.
 *
 * Executes every gate in sequence and exits with code 1 if ANY gate fails.
 * Useful for local `pnpm check:all` or as a single CI step.
 *
 * Usage:
 *   node tools/run-gates.mjs
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Ordered list of gate scripts to run. Add new gates here.
 * 
 * Gates are organized by tier for clarity:
 *   - Phase 1: Static Correctness (7 gates)
 *   - Phase 1: Truth Correctness (7 gates)
 *   - Phase 2: Runtime & Security (4 gates)
 */
const GATES = [
  // ── Phase 1: Static Correctness (7) ────────────────────────────────────
  resolve(__dirname, "gates/boundaries.mjs"),
  resolve(__dirname, "gates/module-boundaries.mjs"),
  resolve(__dirname, "gates/catalog.mjs"),
  resolve(__dirname, "gates/test-location.mjs"),
  resolve(__dirname, "gates/token-compliance.mjs"),
  resolve(__dirname, "gates/shadcn-enforcement.mjs"),
  resolve(__dirname, "gates/brand-usage.mjs"),
  resolve(__dirname, "gates/owners-lint.mjs"),
  
  // ── Phase 1: Truth Correctness (8) ─────────────────────────────────────
  resolve(__dirname, "gates/schema-invariants.mjs"),
  resolve(__dirname, "gates/migration-lint.mjs"),
  resolve(__dirname, "gates/contract-db-sync.mjs"),
  resolve(__dirname, "gates/server-clock.mjs"),
  resolve(__dirname, "gates/no-unsafe-money-formatting.mjs"),
  resolve(__dirname, "gates/domain-completeness.mjs"),
  resolve(__dirname, "gates/route-registry-sync.mjs"),
  resolve(__dirname, "gates/ui-meta.mjs"),
  
  // ── Phase 2: Runtime & Security (4) ────────────────────────────────────
  resolve(__dirname, "gates/org-isolation.mjs"),
  resolve(__dirname, "gates/audit-enforcement.mjs"),
  resolve(__dirname, "gates/finance-invariants.mjs"),
  resolve(__dirname, "gates/page-states.mjs"),

  // ── Phase 2: UI Shell ──────────────────────────────────────────────────
  resolve(__dirname, "gates/ui-shell.mjs"),
];

let failed = 0;
const failedGates = [];

for (const gate of GATES) {
  const gateName = gate.split(/[\\/]/).pop().replace(".mjs", "");
  try {
    execFileSync(process.execPath, [gate], {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: process.stderr.isTTY ? "1" : "0" },
    });
  } catch {
    failed++;
    failedGates.push(gateName);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${GATES.length} gate(s) failed:`);
  for (const name of failedGates) {
    console.error(`  ✗ ${name}`);
  }
  console.error();
  process.exit(1);
} else {
  console.log(`\nAll ${GATES.length} gates passed.\n`);
}
