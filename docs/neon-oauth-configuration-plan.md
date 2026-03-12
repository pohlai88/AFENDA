# Neon OAuth: Reference Repo vs AFENDA — Planning & Configuration

This doc clarifies how OAuth works in the [Neon Branches Visualizer](https://github.com/neondatabase/neon-branches-visualizer) reference repo vs AFENDA, and gives a concrete checklist to configure AFENDA’s OAuth (Google/GitHub) correctly.

---

## 1. Two different OAuth models

| Aspect | neon-branches-visualizer | AFENDA |
|--------|---------------------------|--------|
| **Purpose** | “Sign in with **Neon**” to call Neon API on user’s behalf | “Sign in with **Google/GitHub**” to identify app users |
| **Auth stack** | NextAuth (next-auth) | Neon Auth (Better Auth via `@neondatabase/auth`) |
| **OAuth provider** | **Neon** (oauth2.neon.tech, Console OAuth) | **Google** and **GitHub** (configured in Neon Console → Auth) |
| **Callback host** | Your app (`/api/auth/callback/neon`) | **Neon Auth server** (e.g. `https://xxx.neon.tech`); your app only proxies |
| **Route** | `app/api/auth/[...nextauth]/route.ts` (NextAuth handler) | `app/api/auth/[...path]/route.ts` (Neon Auth `auth.handler()`) |
| **Env** | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEON_CLIENT_ID`, `NEON_CLIENT_SECRET` | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `BASE_URL` / `AUTH_URL` |

So:

- **neon-branches-visualizer**: NextAuth + **Neon as OAuth provider** → user logs in with their Neon account; your app gets Neon API tokens.
- **AFENDA**: **Neon Auth** + **Google/GitHub as OAuth providers** → user logs in with Google/GitHub; Neon Auth issues the app session and stores identity in your Neon DB.

We do **not** use NextAuth or “Sign in with Neon” in AFENDA. We use Neon Auth’s built-in Google/GitHub providers and its catch-all API route.

---

## 2. What we took from the reference repo

From [neon-branches-visualizer](https://github.com/neondatabase/neon-branches-visualizer):

- **Single auth API route** that handles all auth (sign-in, callbacks, session). We do the same: one catch-all `app/api/auth/[...path]/route.ts` via `auth.handler()`.
- **Clear env separation**: auth URL, secrets, and app base URL. We mirror this with `NEON_AUTH_*` and `BASE_URL`/`AUTH_URL`.
- **Callback and token handling** live in the auth layer. In their case it’s in NextAuth (Neon provider + refresh); in ours it’s on the Neon Auth server; our route only proxies.

We did **not** copy their NextAuth config or Neon OAuth provider; we only aligned on the idea of one auth route and explicit env.

---

## 3. AFENDA OAuth configuration checklist

Use this to “configure it correctly” for **Google and GitHub** sign-in with Neon Auth.

### 3.1 Route and handler (already correct)

- **Route:** `apps/web/src/app/api/auth/[...path]/route.ts`
- **Exports:** `GET` and `POST` from `auth.handler()` (from `@/lib/auth/server`).
- **Behavior:** Catch-all under `/api/auth/*` (e.g. `/api/auth/signin/social`, `/api/auth/callback/google`, etc.) is forwarded to Neon Auth; no need for a separate callback route in our app.

No change needed here.

### 3.2 Environment variables (app)

Set in `.env` / `.env.config` (and in production env):

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEON_AUTH_BASE_URL` | ✓ | Neon Auth server URL (from Neon Console → Auth), no trailing slash |
| `NEON_AUTH_COOKIE_SECRET` | ✓ | 32+ chars (e.g. `openssl rand -base64 32`) |
| `BASE_URL` or `AUTH_URL` | ✓ | App origin for redirects (e.g. `http://localhost:3000` or `https://your-domain.com`) |
| `NEXT_PUBLIC_NEON_AUTH_URL` | ✓ (if client uses auth SDK) | Same as `NEON_AUTH_BASE_URL` for client-side |

Validate: `node scripts/validate-neon-auth-env.mjs` (from repo root).

### 3.3 Neon Console → Auth

1. **Trusted domains**  
   Add the exact app origin(s) Neon may redirect to:
   - Dev: `http://localhost:3000` (and port if different)
   - Prod: `https://your-domain.com`  
   No trailing slash. Without this, OAuth redirects can be rejected.

2. **Google**  
   - Enable Google provider.  
   - Set Client ID and Client Secret from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 credentials).  
   - In Google OAuth client, set **Authorized redirect URI** to the **Neon Auth** callback, e.g.  
     `https://<your-neon-auth-host>/api/auth/callback/google`  
     (get exact URL from Neon Console → Auth.)

3. **GitHub**  
   - Enable GitHub provider.  
   - Set Client ID and Client Secret from GitHub → Settings → Developer settings → OAuth Apps.  
   - In the GitHub OAuth app, set **Authorization callback URL** to the **Neon Auth** callback, e.g.  
     `https://<your-neon-auth-host>/api/auth/callback/github`  
     (exact URL from Neon Console → Auth.)

4. **Allow localhost**  
   For local dev, ensure “Allow Localhost” (or equivalent) is enabled in Neon Console → Auth if your app runs on `http://localhost:3000`.

### 3.4 Flow summary

1. User clicks “Sign in with GitHub” (or Google) in AFENDA.
2. Server action calls `signIn('github', { callbackUrl })` in `auth.ts`, which uses `auth.signIn.social({ provider: 'github', callbackURL: absoluteCallbackURL })` (Neon Auth SDK).
3. User is redirected to **Neon Auth**, then to GitHub (or Google), then back to **Neon Auth** (callback on Neon’s host).
4. Neon Auth sets the session cookie and redirects to our app at `callbackURL` (e.g. `http://localhost:3000/app`).
5. Our app’s `getSession()` / `toAfendaSession()` reads the cookie and resolves AFENDA identity (via `iam_principal` + membership; see DB trigger `sync_neon_auth_user_to_afenda_identity`).

So: **Google/GitHub callbacks go to Neon Auth, not to our app.** Our app only needs the catch-all route and correct `BASE_URL`/trusted domains.

---

## 4. GitHub MCP (optional)

To use **GitHub MCP** (e.g. `get_file_contents`, `search_code`) against repos like [neon-branches-visualizer](https://github.com/neondatabase/neon-branches-visualizer), you must authenticate the MCP:

- In Cursor: ensure the GitHub MCP server is configured with valid GitHub credentials (e.g. personal access token with `repo` scope).
- If you see “Authentication Failed: Bad credentials”, add or refresh the token in the MCP/server settings.

This is only needed for live access to GitHub from the IDE; it does not affect AFENDA’s OAuth (which uses Neon Auth + Google/GitHub).

---

## 5. References

- [Neon Branches Visualizer](https://github.com/neondatabase/neon-branches-visualizer) — NextAuth + Neon as OAuth provider (different model).
- [Neon Auth Next.js Server Reference](neon-auth-nextjs-server-reference.md) — Our Neon Auth usage, `signIn.social`, troubleshooting.
- [Neon Auth Deployment Runbook](neon-auth-deployment-runbook.md) — Trusted domains, env, production steps.
- [Neon Auth production checklist](neon-auth-production%20checklist.md) — Official Neon checklist (OAuth credentials, etc.).
