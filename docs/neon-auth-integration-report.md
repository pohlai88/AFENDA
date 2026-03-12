# Neon Auth Integration — End-to-End Analysis Report

**Date:** 2026-03-12  
**Scope:** Full Neon Auth integration (server SDK, client SDK, env, routes, actions, security UI, production checklist, webhooks).  
**Neon MCP:** Initialized and used for branch/schema/config validation.  
**References:** [neon-auth-api.md](neon-auth-api.md), [neon-auth-production checklist.md](neon-auth-production%20checklist.md), [neon.webhook.md](neon.webhook.md), [neon-auth-nextjs-server-reference.md](neon-auth-nextjs-server-reference.md), [neon-auth-mcp-validation.md](neon-auth-mcp-validation.md).

---

## 1. Improvements Needed

### 1.1 Production checklist (operational)

| Item | Status | Action |
|------|--------|--------|
| **Trusted domains** | Manual in Console | Before production: add production domain(s) via Neon API `GET/POST /projects/{id}/branches/{id}/auth/domains` or Console → Auth → Domains. Document in runbook. |
| **Custom email provider** | Per last MCP validation: Zoho SMTP configured | None for app code. Ensure production env uses same or desired SMTP. |
| **OAuth credentials** | Per MCP: Google/GitHub configured in Neon | Replace shared dev keys with own OAuth apps for production (Console / API). |
| **Email verification** | Enabled (OTP); require verification on | None. Optional: document verification-link vs OTP choice. |
| **Disable localhost (production)** | Not automated | Before production: call Neon API `PATCH .../auth/allow_localhost` or Console → Settings → Auth → disable "Allow Localhost". Add to deployment checklist. |

### 1.2 Neon Auth webhooks (optional but enterprise)

- **Current:** No webhook route in the app. [neon.webhook.md](neon.webhook.md) describes Neon Auth webhooks for `send.otp`, `send.magic_link`, `user.before_create`, `user.created`.
- **Improvement:** Add `app/webhooks/neon-auth/route.ts` (or equivalent) that:
  - Accepts POST with raw body.
  - Verifies EdDSA signature (X-Neon-Signature, X-Neon-Signature-Kid, X-Neon-Timestamp) using `NEON_AUTH_JWKS_URL` (or base URL + `/.well-known/jwks.json`).
  - Enforces idempotency by `X-Neon-Event-Id` and optional timestamp freshness (e.g. &lt; 5 min).
  - For `user.before_create`: returns `{ allowed: true }` or `{ allowed: false, error_message, error_code }`.
  - For `send.otp` / `send.magic_link`: custom delivery (e.g. own SMTP/SMS) and return 2xx.
  - For `user.created`: return 2xx and process async (e.g. queue job).
- **Config:** Set webhook URL via Neon API `PUT .../auth/webhooks` with `enabled`, `webhook_url` (HTTPS), `enabled_events`, `timeout_seconds`. Document in runbook.

### 1.3 Cookie name alignment

- **Current:** `proxy.ts` checks `better-auth.session_token`, `__Secure-better-auth.session_token`, `neonauth.session_token`, `__Secure-neonauth.session_token`. Cookie policy page lists `neon-auth.session`, `neon-auth.csrf-token`, `neon-auth.callback-url`.
- **Improvement:** Confirm actual session cookie name set by `@neondatabase/auth` (Next.js server) in production (e.g. via Set-Cookie in response or DevTools). If the SDK uses `neon-auth.session` or another name, add it to `SESSION_COOKIE_NAMES` in `proxy.ts` so protected routes do not redirect authenticated users.

### 1.4 Env consistency (BASE_URL / AUTH_URL)

- **Current:** `.env.config` uses `ep-square-pond-a16dtub4` for Neon Auth base URL; `NEON_PROJECT_ID` is `lucky-silence-39754997`. Endpoint and project are different concepts (endpoint is per-branch). Validation script passes with current `.env`.
- **Improvement:** In production, ensure `BASE_URL` / `AUTH_URL` equal the public app origin (e.g. `https://yourapp.com`) and that this origin is in Neon trusted domains. Document in deployment checklist.

### 1.5 JWKS / API key exposure

- **Current:** `NEON_AUTH_JWKS_URL` and `NEON_AUTH_BASE_URL` are in `.env.config`; `NEON_API_KEY` is in `.env.config` (sensitive).
- **Improvement:** Ensure `NEON_API_KEY` is never committed (e.g. `.env.config` in `.gitignore` for prod or use secrets manager). MCP and Neon API calls must use a key with minimal required scope. Document key rotation.

### 1.6 Neon API usage for automation

- **Current:** Neon Auth is configured via Console; no automation in repo for domains, allow_localhost, or webhooks.
- **Improvement:** Add a small script or runbook that uses [Neon Auth API](neon-auth-api.md) (and `NEON_API_KEY`) to: (1) GET/POST trusted domains, (2) PATCH allow_localhost for production, (3) PUT webhook config. Optional: integrate into CI/CD or pre-release checklist.

---

## Implementations completed (post-report)

| Improvement | Implementation |
|-------------|----------------|
| **Webhooks** | `apps/web/src/app/webhooks/neon-auth/route.ts` — POST handler; `verify-webhook.ts` (EdDSA, JWKS cache, 5 min timestamp); `idempotency.ts` (in-memory for `user.before_create`). Events: send.otp, send.magic_link, user.before_create, user.created. |
| **Cookie names** | `proxy.ts` — added `neon-auth.session`, `__Secure-neon-auth.session` to `SESSION_COOKIE_NAMES`. |
| **Runbook** | [neon-auth-deployment-runbook.md](neon-auth-deployment-runbook.md) — trusted domains, BASE_URL/AUTH_URL, webhook URL, disable allow_localhost, secrets, smoke checks, auth lock checklist. |
| **Config script** | `scripts/neon-auth-config.mjs` — list auth/domains/webhooks/allow_localhost; add-domain &lt;url&gt;; webhooks &lt;url&gt;; allow-localhost on\|off. Loads .env.config/.env. |

---

## 2. Production Ready

### 2.1 Neon MCP validation (completed)

- **list_projects:** AFENDA project present (`lucky-silence-39754997`).
- **describe_branch:** Branch `br-raspy-dew-a1bdw3xp` (production, default) has:
  - `neon_auth` schema with: account, invitation, jwks, member, organization, project_config, session, user, verification.
  - `sync_neon_auth_user_to_afenda_identity` trigger for Neon Auth → AFENDA identity sync.
- **run_sql (project_config):** `has_social_providers: true`, `email_password_enabled: true`, endpoint_id `ep-square-pond-a16dtub4`.

### 2.2 Environment validation

- **Script:** `node scripts/validate-neon-auth-env.mjs` — **12/12 checks passed** (base URL, cookie secret length/format, NEXT_PUBLIC_NEON_AUTH_URL, JWKS pattern, session TTL range, cookie domain, URL consistency, email defaults, NODE_ENV).
- **Best practice:** `lib/auth/server.ts` normalizes baseUrl (trim, no trailing slash), enforces cookie secret ≥ 32 chars, optional sessionDataTtl (60–86400), optional cookie domain.

### 2.3 Server-side auth (Next.js)

- **createNeonAuth:** Configured in `apps/web/src/lib/auth/server.ts` with baseUrl, cookies.secret, optional sessionDataTtl, optional domain. Instance is null when env insufficient.
- **auth.handler():** Mounted at `app/api/auth/[...path]/route.ts`; returns 503 when auth not configured.
- **getSession / toAfendaSession:** Session resolved from Neon Auth and mapped to AFENDA (org, principal, roles, permissions) via DB (iam_principal, membership, etc.). Used by `auth()` in `auth.ts` and by protected layouts/pages.

### 2.4 Client-side auth

- **Next.js client:** `apps/web/src/lib/auth/client.ts` uses `createAuthClient` from `@neondatabase/auth/next`; hooks and methods (useAuth, signIn, signOut, signUp, etc.) available.
- **Neon JS SDK:** `apps/web/src/lib/neon-js-client.ts` configures `createAuthClient` and optional `createClient` (auth + Data API) from `@neondatabase/neon-js` using `NEXT_PUBLIC_NEON_AUTH_URL` and optional `NEXT_PUBLIC_NEON_DATA_API_URL`.

### 2.5 Absolute callback URLs

- **Sign-in / sign-up:** Server actions and `auth.ts` build absolute `callbackURL` via `getBaseUrl()` (from AUTH_URL / BASE_URL / VERCEL_URL or localhost fallback). Used for `signIn.email`, `signIn.social`, `signUp.email` to avoid redirect/cookie issues.

### 2.6 Middleware / proxy

- **Custom proxy:** `apps/web/proxy.ts` guards protected path prefixes; checks session cookie (multiple names); redirects to `/auth/signin?next=...`. Middleware re-exports proxy (auth server not used in Edge). Matcher covers `/app`, `/portal`, `/finance`, `/governance`, `/analytics`, `/admin`, `/api/private`.

### 2.7 Auth flows and security UI

- **Implemented:** Sign-in (email, OAuth), sign-up, sign-out, email OTP (send + verify), send verification email, verify email with OTP, list/revoke sessions, revoke other sessions, change password, delete account, MFA setup, Security settings page (MFA, verification, sessions, password, delete).
- **Organizations:** Create/list organizations, invite member (Neon Auth organizations plugin).
- **Admin:** List users, ban user, set role (Neon Auth admin API); role check (`admin`) on admin routes.

### 2.8 API bearer verification

- **Fastify API:** Uses NEON_AUTH_JWKS_URL (or base URL) for JWT verification of bearer tokens where required; identity integrated with AFENDA context.

### 2.9 Documentation and runbooks

- **Docs:** [neon-auth-nextjs-server-reference.md](neon-auth-nextjs-server-reference.md), [neon-javascript-sdk-reference.md](neon-javascript-sdk-reference.md), [neon-auth-mcp-validation.md](neon-auth-mcp-validation.md), [neon-auth-api.md](neon-auth-api.md), [neon-auth-production checklist.md](neon-auth-production%20checklist.md), [neon.webhook.md](neon.webhook.md).
- **Scripts:** `validate-neon-auth-env.mjs`, `neon-mcp-production-context.mjs`, `sync-env-config-to-env.mjs`.

### 2.10 Production checklist (code and config)

- **Config source:** `.env.config` as source of truth; sync to `.env` via `pnpm run sync:env`.
- **Checklist coverage:** Trusted domains, custom email, OAuth, email verification, and allow_localhost are **operational/Console** items; code and env are aligned with Neon Auth best practices. Disabling localhost and verifying trusted domains must be done at release time (see §1.1, §1.6).

---

## Summary

| Area | Verdict |
|------|--------|
| **Neon MCP** | Initialized; project/branch and neon_auth schema validated. |
| **Env validation** | 12/12 checks pass; best-practice config in server. |
| **Server + client auth** | Implemented and documented; absolute callbacks; proxy guard in place. |
| **Security UI & flows** | Sessions, verification, MFA, password, delete account, orgs, admin. |
| **Production readiness** | **Production ready** conditional on: (1) adding production domain(s) to trusted domains, (2) disabling Allow Localhost in production, (3) optional: Neon Auth webhook endpoint + API config, (4) cookie name verification in production. |
| **Improvements** | Webhook endpoint + signature verification; cookie name alignment; runbook/script for domains, allow_localhost, and webhooks; ensure NEON_API_KEY not committed and rotation documented. |
