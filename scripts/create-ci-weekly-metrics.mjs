#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const templatePath = resolve(rootDir, "docs/test-rollout/ci-weekly-metrics-template.md");
const outputDir = resolve(rootDir, "docs/test-rollout/metrics");

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const cliArgs = process.argv.slice(2);
const isDryRun = cliArgs.includes("--dry-run");
const dateArg = cliArgs.find((arg) => arg !== "--dry-run");
const date = dateArg ?? new Date().toISOString().slice(0, 10);

if (dateArg && !isIsoDate(dateArg)) {
  console.error("Invalid date format. Use YYYY-MM-DD.");
  process.exit(1);
}

if (!existsSync(templatePath)) {
  console.error(`Template not found: ${templatePath}`);
  process.exit(1);
}

const outputPath = resolve(outputDir, `ci-weekly-${date}.md`);

if (existsSync(outputPath)) {
  console.error(`Weekly metrics file already exists: ${outputPath}`);
  process.exit(1);
}

const template = readFileSync(templatePath, "utf8");
const content = template.replace("- Week of:", `- Week of: ${date}`);

if (isDryRun) {
  console.log(`DRY RUN: would create ${outputPath}`);
  process.exit(0);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, content, "utf8");

console.log(`Created ${outputPath}`);
