#!/usr/bin/env node

/**
 * Print Neon MCP production context (projectId, branchId) from .env.config / .env.
 * Use this to confirm which project/branch Cursor's Neon MCP should target.
 * Does not print NEON_API_KEY; set that in Cursor MCP config (user-local).
 *
 * Usage: node scripts/neon-mcp-production-context.mjs
 */

import process from "process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function parseEnvContent(content) {
  const out = {};
  for (const line of content.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      out[key.trim()] = value;
    }
  }
  return out;
}

function loadEnv() {
  const candidates = [".env.config", ".env.local", ".env"];
  for (const name of candidates) {
    const envPath = path.resolve(rootDir, name);
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, "utf-8");
    return parseEnvContent(content);
  }
  return {};
}

const env = loadEnv();
const projectId = env.NEON_PROJECT_ID || process.env.NEON_PROJECT_ID;
const branchId = env.NEON_BRANCH_ID || process.env.NEON_BRANCH_ID;

console.log("Neon MCP — production context\n");
console.log("  NEON_PROJECT_ID:", projectId ?? "(not set)");
console.log("  NEON_BRANCH_ID:", branchId ?? "(not set)");
console.log("");
console.log("MCP tool args (use in list_projects, describe_branch, run_sql, etc.):");
console.log(JSON.stringify({ projectId: projectId ?? null, branchId: branchId ?? null }, null, 2));
console.log("");
console.log("Cursor: set NEON_API_KEY in Neon MCP server config (from .env.config or secrets).");
console.log("Then run validation steps in docs/neon-auth-mcp-validation.md (Production section).");
