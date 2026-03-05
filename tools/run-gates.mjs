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

/** Ordered list of gate scripts to run. Add new gates here. */
const GATES = [
  resolve(__dirname, "gates/boundaries.mjs"),
  resolve(__dirname, "gates/catalog.mjs"),
  resolve(__dirname, "gates/test-location.mjs"),
];

let failed = 0;

for (const gate of GATES) {
  try {
    execFileSync(process.execPath, [gate], {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: process.stderr.isTTY ? "1" : "0" },
    });
  } catch {
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${GATES.length} gate(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\nAll ${GATES.length} gates passed.\n`);
}
