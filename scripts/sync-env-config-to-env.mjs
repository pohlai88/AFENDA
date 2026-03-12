#!/usr/bin/env node

/**
 * Sync .env.config into .env for production env.
 * Copies .env.config to .env so app and scripts use the same values.
 *
 * Usage: node scripts/sync-env-config-to-env.mjs
 * (Run from repo root.)
 */

import { copyFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, ".env.config");
const envPath = path.join(rootDir, ".env");

if (!existsSync(configPath)) {
  console.error("Missing .env.config; nothing to sync.");
  process.exit(1);
}

try {
  copyFileSync(configPath, envPath);
  console.log("Synced .env.config → .env for production env.");
} catch (err) {
  console.error("Sync failed:", err.message);
  process.exit(1);
}
