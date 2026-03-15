#!/usr/bin/env node

/**
 * Recover repo after crash: clear Turborepo cache, Next.js cache, optionally reinstall.
 * Run from repo root: node scripts/recover-caches.mjs [--reinstall]
 */

import { rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const dirs = [
  path.join(root, ".turbo"),
  path.join(root, "apps", "web", ".next"),
  path.join(root, "apps", "web", ".turbo"),
];

console.log("Recovering caches...\n");

for (const dir of dirs) {
  if (existsSync(dir)) {
    try {
      rmSync(dir, { recursive: true });
      console.log("Removed:", path.relative(root, dir));
    } catch (e) {
      console.error("Failed to remove", dir, e.message);
    }
  } else {
    console.log("(skip, not present):", path.relative(root, dir));
  }
}

console.log("\nDone. If issues persist, run:");
console.log("  pnpm store prune");
console.log("  pnpm install");
console.log("\nOr run with --reinstall to run those automatically.");
if (process.argv.includes("--reinstall")) {
  console.log("\nRunning pnpm store prune && pnpm install...");
  execSync("pnpm store prune", { cwd: root, stdio: "inherit" });
  execSync("pnpm install", { cwd: root, stdio: "inherit" });
  console.log("Reinstall complete.");
}
