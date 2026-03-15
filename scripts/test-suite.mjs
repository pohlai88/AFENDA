#!/usr/bin/env node

import { execSync } from "node:child_process";

function printUsage() {
  console.log(`Usage: node scripts/test-suite.mjs <mode> [--base-ref=<ref>]\n\nModes:\n  changed-unit\n  changed-e2e\n  unit\n  coverage\n  integration\n  e2e\n  build\n  pr-required\n  main-required\n  all\n\nOptions:\n  --base-ref=<ref>   Git ref for changed tests (default: origin/main)`);
}

const rawArgs = process.argv.slice(2);

if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  printUsage();
  process.exit(0);
}

const mode = rawArgs.find((arg) => !arg.startsWith("--"));

if (!mode) {
  printUsage();
  process.exit(1);
}

const baseRefArg = rawArgs.find((arg) => arg.startsWith("--base-ref="));
const baseRef = baseRefArg ? baseRefArg.replace("--base-ref=", "") : "origin/main";
const playwrightBaseRef = baseRef.replace(/^origin\//, "");

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit" });
}

function runChangedUnit() {
  run(`pnpm -r --if-present test -- --changed=${baseRef} --run`);
}

function runChangedE2E() {
  run(`pnpm -C apps/web exec playwright test --project=chromium --only-changed=${playwrightBaseRef} --pass-with-no-tests`);
}

function runUnit() {
  run("pnpm test");
}

function runCoverage() {
  run("pnpm test:coverage");
}

function runIntegration() {
  run("pnpm db:migrate");
  run("pnpm -C apps/api test");
}

function runE2E() {
  run("pnpm e2e");
}

function runBuild() {
  run("pnpm build");
}

function runPrRequired() {
  run("pnpm check:all");
  runChangedUnit();
  runChangedE2E();
}

function runMainRequired() {
  run("pnpm check:all");
  runUnit();
  runCoverage();
  runIntegration();
  runE2E();
  runBuild();
}

const handlers = {
  "changed-unit": runChangedUnit,
  "changed-e2e": runChangedE2E,
  unit: runUnit,
  coverage: runCoverage,
  integration: runIntegration,
  e2e: runE2E,
  build: runBuild,
  "pr-required": runPrRequired,
  "main-required": runMainRequired,
  all: runMainRequired,
};

const handler = handlers[mode];

if (!handler) {
  console.error(`Unknown mode: ${mode}`);
  printUsage();
  process.exit(1);
}

handler();