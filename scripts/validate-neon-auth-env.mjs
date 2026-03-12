#!/usr/bin/env node

/**
 * Neon Auth env validation (per https://neon.com/docs/auth/reference/nextjs-server)
 *
 * Required:
 *   NEON_AUTH_BASE_URL   — Your Neon Auth server URL from the Neon Console
 *   NEON_AUTH_COOKIE_SECRET — Secret for signing session cookies (32+ characters, HMAC-SHA256)
 *   Generate secret: openssl rand -base64 32
 *
 * Usage:
 *   node scripts/validate-neon-auth-env.mjs
 *   (Loads .env.local, .env, or .env.config from repo root)
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

function loadEnvFile() {
  const candidates = [".env.local", ".env", ".env.config"];
  for (const name of candidates) {
    const envPath = path.resolve(rootDir, name);
    if (!existsSync(envPath)) continue;
    try {
      const content = readFileSync(envPath, "utf-8");
      const parsed = parseEnvContent(content);
      for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
      console.log(`✓ Loaded environment from ${name}\n`);
      return;
    } catch (err) {
      console.warn(`⚠ Could not load ${name}: ${err.message}\n`);
    }
  }
  console.warn("⚠ No .env.local, .env, or .env.config found; using process.env only.\n");
}

loadEnvFile();

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function header(title) {
  console.log("\n" + colors.blue + "━".repeat(60) + colors.reset);
  log(colors.blue, `▸ ${title}`);
  console.log(colors.blue + "━".repeat(60) + colors.reset);
}

function check(label, condition, errorMsg) {
  if (condition) {
    log(colors.green, `  ✓ ${label}`);
    return true;
  } else {
    log(colors.red, `  ✗ ${label}`);
    if (errorMsg) log(colors.gray, `    → ${errorMsg}`);
    return false;
  }
}

// Validation checks
const checks = [];

// ─────────────────────────────────────────────────────────────────────────────
// 0. Neon Auth required (official docs: nextjs-server reference)
// ─────────────────────────────────────────────────────────────────────────────

header("Neon Auth required (.env.local)");

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

const baseUrlOk =
  typeof baseUrl === "string" &&
  baseUrl.startsWith("https://") &&
  (baseUrl.includes("neonauth") || baseUrl.includes("neon.tech")) &&
  baseUrl.includes("/auth");
const secretOk =
  typeof cookieSecret === "string" && cookieSecret.length >= 32;

check(
  "NEON_AUTH_BASE_URL is set and looks like Neon Auth URL",
  baseUrlOk,
  baseUrl
    ? "Must be https and contain neonauth/neon.tech and /auth (e.g. https://xxx.neonauth.region.aws.neon.tech/neondb/auth)"
    : "Missing. Get from Neon Console → Project → Branch → Auth → Configuration",
);
checks.push(baseUrlOk);

check(
  "NEON_AUTH_COOKIE_SECRET is set and 32+ characters (HMAC-SHA256)",
  secretOk,
  cookieSecret
    ? `Length is ${cookieSecret.length}; need >= 32. Generate: openssl rand -base64 32`
    : "Missing. Generate: openssl rand -base64 32",
);
checks.push(secretOk);

if (secretOk && cookieSecret) {
  const isBase64 = /^[A-Za-z0-9+/]+=*$/i.test(cookieSecret) && cookieSecret.length >= 44;
  check(
    "  (recommended) Cookie secret is base64 32 bytes (44 chars)",
    isBase64,
    "Optional: use openssl rand -base64 32 for 44-char base64 secret",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Environment Variables (full set)
// ─────────────────────────────────────────────────────────────────────────────

header("Environment Variables (full)");

const requiredEnv = {
  NEON_AUTH_BASE_URL: {
    pattern: /^https:\/\/.+\.neonauth\..*\.aws\.neon\.tech\/\w+\/auth$/i,
  },
  NEON_AUTH_COOKIE_SECRET: {
    pattern: null, // already checked above (32+ chars)
  },
  NEXT_PUBLIC_NEON_AUTH_URL: {
    pattern: /^https:\/\/.+\.neonauth\..*\.aws\.neon\.tech\/\w+\/auth$/i,
  },
  NEON_AUTH_JWKS_URL: {
    pattern: /^https:\/\/.+\.neonauth\..*\.aws\.neon\.tech\/\w+\/auth\/.well-known\/jwks\.json$/i,
  },
};

for (const [key, { pattern }] of Object.entries(requiredEnv)) {
  const value = process.env[key];
  const exists = check(`${key}`, !!value, "Missing");
  if (exists && pattern) {
    check(`  format`, pattern.test(value), `Unexpected format`);
  }
  checks.push(exists);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cookie Secret Validation
// ─────────────────────────────────────────────────────────────────────────────

header("Cookie Secret Validation");

const secret = process.env.NEON_AUTH_COOKIE_SECRET;
if (secret) {
  try {
    // Verify valid base64
    const decoded = Buffer.from(secret, "base64");
    const isBase64 = Buffer.from(decoded).toString("base64") === secret;
    check(
      "NEON_AUTH_COOKIE_SECRET is valid base64",
      isBase64,
      "Secret is not valid base64"
    );

    // Verify 32 bytes
    check(
      "NEON_AUTH_COOKIE_SECRET is 32 bytes",
      decoded.length === 32,
      `Expected 32 bytes, got ${decoded.length}`
    );

    checks.push(isBase64 && decoded.length === 32);
  } catch (err) {
    log(colors.red, `  ✗ Failed to decode secret: ${err.message}`);
    checks.push(false);
  }
} else {
  checks.push(false);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Email Configuration
// ─────────────────────────────────────────────────────────────────────────────

header("Email Configuration");

const emailEnv = {
  DEFAULT_FROM_EMAIL: "no-reply@nexuscanon.com",
  DEFAULT_FROM_NAME: "AFENDA",
};

for (const [key, expectedValue] of Object.entries(emailEnv)) {
  const value = process.env[key];
  const hasValue = !!value;
  check(
    `${key} is set`,
    hasValue,
    `Missing required email variable`
  );

  if (hasValue) {
    const isCorrect = value === expectedValue;
    check(
      `  ${key} == "${expectedValue}"`,
      isCorrect,
      `Expected "${expectedValue}", got "${value}"`
    );
    checks.push(isCorrect);
  } else {
    checks.push(false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. URLs Consistency
// ─────────────────────────────────────────────────────────────────────────────

header("URL Consistency");

const publicUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

if (baseUrl && publicUrl) {
  const match = baseUrl === publicUrl;
  check(
    "NEON_AUTH_BASE_URL matches NEXT_PUBLIC_NEON_AUTH_URL",
    match,
    `Base: ${baseUrl}, Public: ${publicUrl}`
  );
  checks.push(match);
} else {
  checks.push(false);
}

const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
if (baseUrl && jwksUrl) {
  const expectedJwks = `${baseUrl}/.well-known/jwks.json`;
  const match = jwksUrl === expectedJwks;
  check(
    "NEON_AUTH_JWKS_URL matches expected pattern",
    match,
    `Expected: ${expectedJwks}, Got: ${jwksUrl}`
  );
  checks.push(match);
} else {
  checks.push(false);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Optional Neon Auth (best practice)
// ─────────────────────────────────────────────────────────────────────────────

header("Optional Neon Auth (best practice)");

const sessionTtlRaw = process.env.NEON_AUTH_SESSION_TTL;
const sessionTtl = sessionTtlRaw ? Number(sessionTtlRaw) : NaN;
const SESSION_TTL_MIN = 60;
const SESSION_TTL_MAX = 86400;
const sessionTtlOk =
  !sessionTtlRaw ||
  (!Number.isNaN(sessionTtl) && sessionTtl >= SESSION_TTL_MIN && sessionTtl <= SESSION_TTL_MAX);
check(
  "NEON_AUTH_SESSION_TTL (optional) is 60–86400 seconds or unset",
  sessionTtlOk,
  sessionTtlRaw
    ? `Expected 60–86400, got "${sessionTtlRaw}". Cache TTL in seconds (default 300).`
    : "Unset; SDK uses default 300s.",
);
if (sessionTtlRaw && !sessionTtlOk) checks.push(false);

const cookieDomain = process.env.NEON_AUTH_COOKIE_DOMAIN?.trim();
const cookieDomainOk = !cookieDomain || (cookieDomain.startsWith(".") && cookieDomain.length >= 2);
check(
  "NEON_AUTH_COOKIE_DOMAIN (optional) starts with . for subdomain or unset",
  cookieDomainOk,
  cookieDomain
    ? 'For cross-subdomain sessions use e.g. ".example.com"'
    : "Unset; use when cookies must work across subdomains.",
);
if (cookieDomain && !cookieDomainOk) checks.push(false);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Node Environment
// ─────────────────────────────────────────────────────────────────────────────

header("Node Environment");

const nodeEnv = process.env.NODE_ENV;
const isProd = nodeEnv === "production";

check(
  "NODE_ENV is set",
  !!nodeEnv,
  "NODE_ENV not set"
);

check(
  "NODE_ENV is appropriate",
  nodeEnv === "production" || nodeEnv === "staging" || nodeEnv === "development",
  `NODE_ENV="${nodeEnv}" is not recognized`
);

checks.push(!!nodeEnv);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Summary
// ─────────────────────────────────────────────────────────────────────────────

header("Summary");

const totalChecks = checks.length;
const passedChecks = checks.filter(Boolean).length;
const percentage = Math.round((passedChecks / totalChecks) * 100);

log(colors.blue, `Passed: ${passedChecks}/${totalChecks} checks (${percentage}%)`);

if (passedChecks === totalChecks) {
  log(colors.green, "\n✓ All checks passed! Ready for deployment.\n");
  process.exit(0);
} else {
  log(
    colors.red,
    `\n✗ ${totalChecks - passedChecks} check(s) failed. Please fix before deploying.\n`
  );
  log(colors.yellow, "Quick fixes:");
  log(
    colors.gray,
    `  • Generate new cookie secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  );
  log(colors.gray, `  • Ensure Neon Console Auth settings are saved`);
  log(colors.gray, `  • Set in .env.local or .env: NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET (32+ chars)`);
  log(colors.gray, `  • Generate secret: openssl rand -base64 32`);
  process.exit(1);
}
