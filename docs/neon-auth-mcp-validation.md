# Neon Auth & OAuth Validation via Neon MCP

Use the **Neon MCP** (Cursor) to validate Neon Auth provisioning and OAuth configuration without leaving the editor.

**Related:** Implementation decisions (handler route, custom proxy vs `auth.middleware()`) are documented and validated against **Next.js 16 official docs** via the Next.js DevTools MCP in [Neon Auth Next.js Server SDK — Reference](./neon-auth-nextjs-server-reference.md#nextjs-mcp-validation).

## Prerequisites

- Neon MCP server enabled in Cursor (e.g. **user-Neon**).
- Neon API key configured so MCP can list projects and run SQL.

## Validation Steps (Neon MCP Tools)

Run these in order. All use **projectId** `lucky-silence-39754997` (AFENDA) and default branch **br-raspy-dew-a1bdw3xp** unless noted.

### 1. List projects

**Tool:** `list_projects`

**Args:** `{ "limit": 10, "search": "afenda" }`

**Check:** Confirm AFENDA project exists and note `id` (e.g. `lucky-silence-39754997`).

---

### 2. Describe project

**Tool:** `describe_project`

**Args:** `{ "projectId": "lucky-silence-39754997" }`

**Check:** Project name "AFENDA", default branch listed (e.g. `br-raspy-dew-a1bdw3xp`).

---

### 3. Describe branch (Neon Auth schema)

**Tool:** `describe_branch`

**Args:**  
`{ "projectId": "lucky-silence-39754997", "branchId": "br-raspy-dew-a1bdw3xp" }`

**Check:** Tree includes **neon_auth** schema with:

- `neon_auth.user`
- `neon_auth.session`
- `neon_auth.account`
- `neon_auth.organization`
- `neon_auth.member`
- `neon_auth.invitation`

Also confirm **public** schema has function `sync_neon_auth_user_to_afenda_identity` and trigger `neon_auth_user_sync_to_afenda_identity` on `neon_auth.user` (so OAuth sign-ups get AFENDA identity + membership).

- `neon_auth.verification`
- `neon_auth.jwks`
- `neon_auth.project_config`

If these exist, Neon Auth is provisioned for this branch.

---

### 4. Get database tables

**Tool:** `get_database_tables`

**Args:**  
`{ "projectId": "lucky-silence-39754997", "branchId": "br-raspy-dew-a1bdw3xp" }`

**Check:** Response includes tables in schema `neon_auth` (user, session, account, organization, member, invitation, verification, jwks, project_config).

---

### 5. Inspect Auth & OAuth configuration

**Tool:** `run_sql`

**Args:**  
`{ "projectId": "lucky-silence-39754997", "branchId": "br-raspy-dew-a1bdw3xp", "sql": "SELECT id, name, endpoint_id, social_providers, email_and_password, plugin_configs FROM neon_auth.project_config LIMIT 1;" }`

Or to avoid schema-specific column handling, use:

**SQL:** `SELECT * FROM neon_auth.project_config LIMIT 1;`

**Check (in the single row returned):**

| Field | What to verify |
|-------|----------------|
| **social_providers** | Array of OAuth providers (e.g. `google`, `github`) with `id` and non-empty config. |
| **email_and_password** | `enabled: true`; optional `emailVerificationMethod`, `requireEmailVerification`. |
| **plugin_configs.organization** | `enabled: true` if using Neon Auth organizations. |
| **email_provider** | Present if transactional email (verification, reset) is configured. |

Do not log or store `clientSecret` / `password` from the response.

---

### 6. Optional: User/session counts

**Tool:** `run_sql`

**SQL (one per call):**

- `SELECT COUNT(*) AS user_count FROM neon_auth."user";`
- `SELECT COUNT(*) AS session_count FROM neon_auth.session;`

**Check:** Counts are numeric; confirms tables are readable and in use.

---

## Last validation result (AFENDA)

| Check | Result |
|-------|--------|
| **Project** | AFENDA (`lucky-silence-39754997`), region `aws-ap-southeast-1` |
| **Branch** | `br-raspy-dew-a1bdw3xp` (production, default) |
| **neon_auth schema** | Present with user, session, account, organization, member, invitation, verification, jwks, project_config |
| **OAuth** | Google and GitHub configured in `project_config` (credentials in Neon only) |
| **Email/password** | Enabled; email verification OTP; require email verification on |
| **Organization plugin** | Enabled (creator role, membership limit, invitations) |
| **Email provider** | Custom SMTP (Zoho) configured for Neon Auth |
| **Users** | 1 user in `neon_auth."user"` |

---

## Provisioning Neon Auth (if missing)

If `describe_branch` does **not** show the `neon_auth` schema:

**Tool:** `provision_neon_auth`

**Args:**  
`{ "projectId": "lucky-silence-39754997", "branchId": "br-raspy-dew-a1bdw3xp" }`  
(Omit `branchId` to use default branch.)

Then re-run the validation steps above.

---

## Troubleshooting: OAuth completes but app shows login again

If users can complete Google/GitHub sign-in but are sent back to the login screen with no errors:

### 1. Session cookie name (middleware)

The middleware in `apps/web/proxy.ts` must recognize the cookie Neon Auth / Better Auth set. It checks for:

- `better-auth.session_token`
- `__Secure-better-auth.session_token`
- `neonauth.session_token`
- `__Secure-neonauth.session_token`

If your cookie name differs, add it to `SESSION_COOKIE_NAMES` in `proxy.ts`. In DevTools → Application → Cookies, confirm the cookie is present and under your app’s origin after OAuth.

### 2. Trusted domains (Neon Console)

Neon Auth only redirects to allowlisted domains. For local dev, `http://localhost:*` is allowed by default. For production:

1. **Console → Auth → Configuration → Domains**
2. Add your app URL with protocol, e.g. `https://app.example.com` (no trailing slash).

See [Configure trusted domains](https://neon.com/docs/auth/guides/configure-domains).

### 3. Absolute callback URL

The app passes an **absolute** callback URL to `signIn.social()` (e.g. `http://localhost:3000/app` or `https://yourapp.com/app`) so Neon Auth can redirect back correctly. This is built from:

- `BASE_URL` or `AUTH_URL` in `.env`, or
- `VERCEL_URL` on Vercel, or
- `http://localhost:3000` as fallback.

Ensure `BASE_URL` / `AUTH_URL` matches the URL you use in the browser (including port for local dev, e.g. `http://localhost:3000`).

### 4. New OAuth users and AFENDA identity

After OAuth, `getSession()` turns the Neon Auth session into an AFENDA session by resolving `iam_principal` (and org/roles) from the user’s email. For **new** OAuth users, a DB trigger `sync_neon_auth_user_to_afenda_identity` (or equivalent) should create the principal when a row is inserted into `neon_auth.user`. If that trigger is missing or fails:

- Neon Auth has a session (cookie is set),
- but `toAfendaSession()` finds no `iam_principal` and returns `null`,
- so the app redirects to sign-in.

**Check:** After a new user signs in with OAuth, query the DB: does a row exist in `public.iam_principal` with that user’s email? Does that principal have at least one row in `public.membership` (status active)? If the principal exists but has no membership, `toAfendaSession()` still returns `null` and the app redirects to sign-in.

**Fix:** The trigger must create not only `party`, `person`, and `iam_principal`, but also **party_role** (person in a default org, e.g. slug `demo`) and **membership** (principal → party_role, status active). Apply the updated trigger once:

```bash
pnpm run neon:auth-sync-fix
```

Optional: backfill existing Neon Auth users who already have `iam_principal` but no membership:

```bash
pnpm -C packages/db node scripts/run-fix-neon-auth-sync.mjs --backfill
```

SQL and script: `packages/db/scripts/fix-neon-auth-sync-trigger.sql`, `packages/db/scripts/run-fix-neon-auth-sync.mjs`. Requires `DATABASE_URL` (or `DATABASE_URL_MIGRATIONS`) in `.env` at repo root.

### 4b. OAuth redirect (NEXT_REDIRECT) — must re-throw

When the user clicks “Sign in with Google” or “Sign in with GitHub”, the server calls `signIn(provider, { callbackUrl })` in `auth.ts`, which on success calls `redirect(result.data?.url)`. In Next.js, `redirect()` throws an error with `digest: "NEXT_REDIRECT"` to perform the redirect. If the OAuth server action catches that and treats it as a failure, the user never reaches the provider and may see “NEXT_REDIRECT” or stay on the sign-in page.

**Fix:** In `apps/web/src/app/auth/_actions/oauth.ts`, the Google and GitHub actions must **re-throw** when the caught error is a Next.js redirect (e.g. `digest.startsWith("NEXT_REDIRECT")`). Only real errors should be turned into `oauth_error` redirects to the sign-in page.

### 5. Debug session state (dev only)

To see exactly which step fails after OAuth:

1. **URL:** After being sent back to the sign-in page, add `?debug_session=1` and reload, e.g.  
   `http://localhost:3000/auth/signin?debug_session=1`
2. A small **Session debug (dev)** banner shows:
   - **Neon session:** yes/no (and email if present)
   - **AFENDA session:** yes/no
   - Optional hint (e.g. “Neon session exists but no AFENDA identity”).
3. Or call the API directly: **GET** `/api/debug-session` (only when `NODE_ENV !== "production"` or `DEBUG_SESSION=1`).

Use this to tell whether the problem is missing Neon cookie vs. missing AFENDA principal.

---

## Production: Initialize Neon MCP

To use Neon MCP against the **actual production** Neon project and branch (same as in `.env.config`):

### 1. MCP API key

- **Cursor:** Ensure the Neon MCP server (e.g. **user-Neon**) is configured with your Neon API key.
- **Source:** Use `NEON_API_KEY` from `.env.config` (or your secrets manager). Do not commit the key; Cursor MCP config is typically user-local.
- **Neon Console:** API keys are under **Project → Settings → API keys**. Use a key with at least **Console** or **API** access so MCP can list projects, describe branches, and run SQL.

### 2. Project and branch (production)

From `.env.config` (or production env):

| Env var | Use in MCP |
|--------|------------|
| `NEON_PROJECT_ID` | `projectId` in `list_projects`, `describe_project`, `describe_branch`, `get_database_tables`, `run_sql`, `provision_neon_auth` |
| `NEON_BRANCH_ID` | `branchId` when targeting the production branch (omit to use project default) |

Example MCP args for production:

```json
{ "projectId": "lucky-silence-39754997", "branchId": "br-raspy-dew-a1bdw3xp" }
```

### 3. Validation steps (production)

Run the same [Validation Steps](#validation-steps-neon-mcp-tools) above with the production `projectId` and `branchId`:

1. **list_projects** — confirm project exists.
2. **describe_branch** — confirm `neon_auth` schema and tables exist.
3. **get_database_tables** — list `neon_auth.*` tables.
4. **run_sql** — inspect `neon_auth.project_config`, user/session counts, trusted domains.

### 4. Script: production MCP context

From repo root, run:

```bash
node scripts/neon-mcp-production-context.mjs
```

This prints `projectId`, `branchId`, and a reminder to set `NEON_API_KEY` in Cursor’s Neon MCP config. It does not print the API key. Use this to confirm which project/branch MCP should target.

---

## Related

- **Env validation (no MCP):** `node scripts/validate-neon-auth-env.mjs` — validates env vars and URL/cookie consistency.
- **Neon Auth docs:** [Overview](https://neon.com/docs/auth/overview), [Next.js quick start](https://neon.com/docs/auth/quick-start/nextjs), [Configure domains](https://neon.com/docs/auth/guides/configure-domains).
- **AFENDA deployment:** `NEON_AUTH_DEPLOYMENT.md`.
