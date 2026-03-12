#!/usr/bin/env node

/**
 * Neon Auth configuration via Neon API (domains, webhooks, allow_localhost).
 * Use before production deploy. Requires NEON_API_KEY, NEON_PROJECT_ID, NEON_BRANCH_ID.
 * Loads .env.config, .env.local, or .env from repo root when present.
 *
 * Usage:
 *   node scripts/neon-auth-config.mjs                    # list auth config + domains
 *   node scripts/neon-auth-config.mjs add-domain <url>  # add trusted domain
 *   node scripts/neon-auth-config.mjs webhooks <url>    # set webhook URL (HTTPS)
 *   node scripts/neon-auth-config.mjs allow-localhost off   # disable for production
 *   node scripts/neon-auth-config.mjs allow-localhost on   # enable for dev
 */

import process from "process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function parseEnv(content) {
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
  for (const name of [".env.config", ".env.local", ".env"]) {
    const envPath = path.resolve(rootDir, name);
    if (!existsSync(envPath)) continue;
    try {
      const content = readFileSync(envPath, "utf-8");
      Object.assign(process.env, parseEnv(content));
      break;
    } catch (_) {}
  }
}

loadEnv();

const BASE = "https://console.neon.tech/api/v2";
const projectId = process.env.NEON_PROJECT_ID;
const branchId = process.env.NEON_BRANCH_ID;
const apiKey = process.env.NEON_API_KEY;

function authHeaders() {
  if (!apiKey) {
    console.error("NEON_API_KEY is not set.");
    process.exit(1);
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function authPath(segment) {
  if (!projectId) {
    console.error("NEON_PROJECT_ID is not set.");
    process.exit(1);
  }
  const branch = branchId ? `/${branchId}` : "";
  return `${BASE}/projects/${projectId}/branches${branch}/auth${segment}`;
}

async function get(segment) {
  const res = await fetch(authPath(segment), { headers: authHeaders() });
  if (!res.ok) {
    console.error(segment, res.status, await res.text());
    return null;
  }
  return res.json();
}

async function put(segment, body) {
  const res = await fetch(authPath(segment), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(segment, res.status, await res.text());
    return false;
  }
  return true;
}

async function post(segment, body) {
  const res = await fetch(authPath(segment), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(segment, res.status, await res.text());
    return false;
  }
  return true;
}

async function patch(segment, body) {
  const res = await fetch(authPath(segment), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(segment, res.status, await res.text());
    return false;
  }
  return true;
}

async function main() {
  const cmd = process.argv[2];
  const arg = process.argv[3];

  if (!projectId) {
    console.error("NEON_PROJECT_ID is required. Set from .env.config or environment.");
    process.exit(1);
  }

  if (!cmd || cmd === "list") {
    const auth = await get("");
    if (auth) {
      console.log("Auth config:", JSON.stringify(auth, null, 2));
    }
    const domains = await get("/domains");
    if (domains != null) {
      console.log("Domains:", JSON.stringify(domains, null, 2));
    }
    const webhooks = await get("/webhooks");
    if (webhooks != null) {
      console.log("Webhooks:", JSON.stringify(webhooks, null, 2));
    }
    const localhost = await get("/allow_localhost");
    if (localhost != null) {
      console.log("Allow localhost:", JSON.stringify(localhost, null, 2));
    }
    return;
  }

  if (cmd === "add-domain") {
    const domain = arg || process.env.PRODUCTION_DOMAIN;
    if (!domain) {
      console.error("Usage: neon-auth-config.mjs add-domain <https://your-domain.com>");
      process.exit(1);
    }
    const ok = await post("/domains", { domain });
    console.log(ok ? "Domain added." : "Failed to add domain.");
    process.exit(ok ? 0 : 1);
  }

  if (cmd === "webhooks") {
    const webhookUrl = arg || process.env.NEON_AUTH_WEBHOOK_URL;
    if (!webhookUrl || !webhookUrl.startsWith("https://")) {
      console.error("Usage: neon-auth-config.mjs webhooks <https://your-app.com/webhooks/neon-auth>");
      process.exit(1);
    }
    const ok = await put("/webhooks", {
      enabled: true,
      webhook_url: webhookUrl,
      enabled_events: ["send.otp", "send.magic_link", "user.before_create", "user.created"],
      timeout_seconds: 5,
    });
    console.log(ok ? "Webhooks configured." : "Failed to set webhooks.");
    process.exit(ok ? 0 : 1);
  }

  if (cmd === "allow-localhost") {
    const value = (arg || "off").toLowerCase();
    const allow = value === "on" || value === "true" || value === "1";
    const ok = await patch("/allow_localhost", { allow_localhost: allow });
    console.log(ok ? `Allow localhost set to ${allow}.` : "Failed to update allow_localhost.");
    process.exit(ok ? 0 : 1);
  }

  console.error("Unknown command:", cmd);
  console.error("Commands: list | add-domain <url> | webhooks <url> | allow-localhost on|off");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
