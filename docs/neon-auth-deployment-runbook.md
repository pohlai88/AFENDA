# Neon Auth — Deployment Runbook

Use this runbook before and after deploying the app to production. Lock auth-related dev and ensure production configuration is correct.

**References:** [neon-auth-api.md](neon-auth-api.md), [neon-auth-production checklist.md](neon-auth-production%20checklist.md), [neon.webhook.md](neon.webhook.md), [neon-auth-integration-report.md](neon-auth-integration-report.md).

---

## Prerequisites

- **NEON_API_KEY** — From Neon Console → Project → Settings → API keys. Use a key with Console/API access. **Do not commit.** Store in secrets manager or CI env.
- **NEON_PROJECT_ID** — From `.env.config` or Neon Console (e.g. `lucky-silence-39754997`).
- **NEON_BRANCH_ID** — Production branch (e.g. `br-raspy-dew-a1bdw3xp`). Omit to use project default.

Base URL for all requests: `https://console.neon.tech/api/v2`

---

## 1. Before first production deploy

### 1.1 Configure trusted domains

OAuth and email verification redirects only work for allowlisted domains.

**Add production domain:**

```bash
curl -X POST "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_BRANCH_ID}/auth/domains" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "https://your-production-domain.com"}'
```

Use the exact origin (protocol + host, no trailing slash). For multiple environments add each (e.g. `https://app.example.com`, `https://staging.example.com`).

**List current domains:**

```bash
curl -s "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_BRANCH_ID}/auth/domains" \
  -H "Authorization: Bearer $NEON_API_KEY"
```

### 1.2 Environment variables (app)

Ensure production env has:

| Variable | Required | Notes |
|----------|----------|--------|
| **NEON_AUTH_BASE_URL** | ✓ | From Neon Auth config (no trailing slash). |
| **NEON_AUTH_COOKIE_SECRET** | ✓ | 32+ chars; e.g. `openssl rand -base64 32`. |
| **NEXT_PUBLIC_NEON_AUTH_URL** | ✓ | Same as NEON_AUTH_BASE_URL (client-side). |
| **BASE_URL** or **AUTH_URL** | ✓ | Production app origin (e.g. `https://your-domain.com`). Used for absolute callback URLs. |
| **NEON_AUTH_JWKS_URL** | Optional | Defaults to `{NEON_AUTH_BASE_URL}/.well-known/jwks.json`. |
| **NEON_AUTH_SESSION_TTL** | Optional | Seconds (60–86400). Default 300. |
| **NEON_AUTH_COOKIE_DOMAIN** | Optional | e.g. `.your-domain.com` for cross-subdomain cookies. |

Run from repo root: `node scripts/validate-neon-auth-env.mjs` (with production env loaded) and fix any failures.

### 1.3 Webhook URL (optional)

If using [Neon Auth webhooks](neon.webhook.md), set the webhook to your **public HTTPS** endpoint (Neon rejects localhost):

```bash
curl -X PUT "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_BRANCH_ID}/auth/webhooks" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "webhook_url": "https://your-production-domain.com/webhooks/neon-auth",
    "enabled_events": ["send.otp", "send.magic_link", "user.before_create", "user.created"],
    "timeout_seconds": 5
  }'
```

App route: `apps/web/src/app/webhooks/neon-auth/route.ts` (verifies EdDSA signature, idempotency for `user.before_create`).

---

## 2. Before production go-live (security)

### 2.1 Disable Allow Localhost

**Required for production.** Prevents auth requests from localhost.

```bash
curl -X PATCH "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_BRANCH_ID}/auth/allow_localhost" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"allow_localhost": false}'
```

Re-enable for local dev if needed: `{"allow_localhost": true}`.

### 2.2 Secrets

- **NEON_API_KEY:** Never commit. Rotate periodically; update Cursor MCP and CI secrets.
- **NEON_AUTH_COOKIE_SECRET:** Rotate only with a planned session reset (all users re-login). Store in secrets manager.

---

## 3. After deploy

### 3.1 Smoke checks

1. **Sign-in** — Email/password and OAuth (Google/GitHub) redirect back to app with session.
2. **Callback URL** — Confirm no redirect to wrong origin (BASE_URL / AUTH_URL must match app origin).
3. **Cookie** — Session cookie present on production domain (check name in DevTools; proxy accepts `neon-auth.session`, `better-auth.session_token`, etc.).

### 3.2 Webhook (if enabled)

- Send a test signup or OTP from production; confirm webhook receives POST (e.g. via logs or monitoring).
- Signature verification must pass (invalid signature returns 401).

---

## 4. Scripted config (optional)

From repo root, with `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID` set:

```bash
node scripts/neon-auth-config.mjs
```

See `scripts/neon-auth-config.mjs` for actions: list auth config, list domains, add domain, set webhooks, set allow_localhost. Use for repeatable pre-release steps.

---

## 5. Locking auth-related dev

Before deployment freeze:

1. Run `node scripts/validate-neon-auth-env.mjs` — must pass.
2. Run `pnpm --filter @afenda/web typecheck` — must pass.
3. Confirm no uncommitted changes in:
   - `apps/web/src/lib/auth/`
   - `apps/web/auth.ts`
   - `apps/web/proxy.ts`
   - `apps/web/src/app/api/auth/`
   - `apps/web/src/app/webhooks/neon-auth/`
   - `apps/web/src/app/auth/`
4. Tag release (e.g. `v1.0.0-auth-lock`) and deploy.

---

## Quick reference

| Task | Command / location |
|------|--------------------|
| Validate env | `node scripts/validate-neon-auth-env.mjs` |
| MCP context | `node scripts/neon-mcp-production-context.mjs` |
| Auth config API | `GET .../projects/{id}/branches/{id}/auth` |
| Domains | `GET/POST/DELETE .../auth/domains` |
| Webhooks | `GET/PUT .../auth/webhooks` |
| Allow localhost | `PATCH .../auth/allow_localhost` |
