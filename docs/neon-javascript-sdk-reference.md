# Neon Auth & Data API TypeScript SDK — Configuration Reference

Reference: [Neon JavaScript SDK](https://neon.com/docs/reference/javascript-sdk). This doc covers installation, configuration, and AFENDA usage of `@neondatabase/neon-js` **without omission**.

---

## Installation

```bash
npm install @neondatabase/neon-js
# or: pnpm add @neondatabase/neon-js
```

**AFENDA:** `@neondatabase/neon-js` is in the pnpm catalog and installed in `apps/web`. Version aligned with `@neondatabase/auth` (0.2.0-beta.1).

---

## Environment variables

Required for auth (client-side):

| Variable | Required | Description |
|----------|----------|-------------|
| **NEXT_PUBLIC_NEON_AUTH_URL** | ✓ (for auth) | Neon Auth server URL. Must match server-side `NEON_AUTH_BASE_URL`. Exposed to browser so the SDK can call the Auth API. |

Optional for Data API (full client):

| Variable | Required | Description |
|----------|----------|-------------|
| **NEXT_PUBLIC_NEON_DATA_API_URL** | — | Neon Data API REST URL (e.g. `https://endpoint.apirest.region.aws.neon.tech/db/rest/v1`). When set, `createClient({ auth, dataApi })` is available for `client.from('table').select()` with automatic auth token. |

---

## Initialize the client

### Auth-only client (`createAuthClient`)

Use when you only need authentication (signIn, signUp, getSession, signOut, etc.). No database query methods.

```ts
import { createAuthClient } from "@neondatabase/neon-js/auth";

const auth = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL); // Vite
// Next.js: process.env.NEXT_PUBLIC_NEON_AUTH_URL
```

**AFENDA:** Configured in `apps/web/src/lib/neon-js-client.ts`:

- `neonAuthClient` — singleton auth client, or `null` if `NEXT_PUBLIC_NEON_AUTH_URL` is not set.
- `isNeonJsAuthConfigured` — `true` when auth URL is set.

Usage in client components:

```ts
"use client";
import { neonAuthClient } from "@/lib/neon-js-client";

if (neonAuthClient) {
  const { data, error } = await neonAuthClient.getSession();
  await neonAuthClient.signIn.email({ email, password });
}
```

### Full client (`createClient`)

Use when you need both authentication and Data API queries (`client.from('table').select()`, `.insert()`, etc.). Auth token is automatically included in Data API requests.

```ts
import { createClient } from "@neondatabase/neon-js";

const client = createClient({
  auth: {
    url: import.meta.env.VITE_NEON_AUTH_URL,
  },
  dataApi: {
    url: import.meta.env.VITE_NEON_DATA_API_URL,
  },
});
```

**AFENDA:** Configured in `apps/web/src/lib/neon-js-client.ts`:

- `neonClient` — full client when both `NEXT_PUBLIC_NEON_AUTH_URL` and `NEXT_PUBLIC_NEON_DATA_API_URL` are set; otherwise `null`.
- `isNeonJsFullClientConfigured` — `true` when both URLs are set.

Usage:

```ts
"use client";
import { neonClient } from "@/lib/neon-js-client";

if (neonClient) {
  await neonClient.auth.signIn.email({ email, password });
  const { data } = await neonClient.from("todos").select("*");
}
```

---

## Adapters (official SDK)

The Neon TypeScript SDK supports multiple auth adapters:

- **BetterAuthVanillaAdapter** (default) — Promise-based: `client.auth.signIn.email()`, etc.
- **BetterAuthReactAdapter** — React hooks, e.g. `useSession()`. See [React quickstart](https://neon.com/docs/auth/quick-start/react).
- **SupabaseAuthAdapter** — Supabase-compatible API. See [migration guide](https://neon.com/docs/auth/migrate/from-supabase).

AFENDA uses the default (vanilla) adapter. For React hooks, the app also uses `@neondatabase/auth/next` in `apps/web/src/lib/auth/client.ts` (Next.js-specific auth client and `useAuth`).

---

## Auth methods (from official reference)

| Method | Description |
|--------|-------------|
| `auth.signUp.email({ email, name, password, image?, callbackURL? })` | Create account |
| `auth.signIn.email({ email, password, rememberMe?, callbackURL? })` | Sign in with email/password |
| `auth.signIn.social({ provider, callbackURL?, ... })` | OAuth (e.g. Google, GitHub) |
| `auth.signOut()` | Clear session |
| `auth.getSession()` | Current session (cached, auto-refresh) |
| `auth.updateUser({ name?, image? })` | Update profile |
| `auth.emailOtp.sendVerificationOtp({ email, type })` | Send OTP |
| `auth.signIn.emailOtp({ email, otp })` | Sign in with OTP |
| `auth.emailOtp.verifyEmail({ email, otp })` | Verify email with OTP |
| `auth.sendVerificationEmail({ email, callbackURL? })` | Send verification email |
| `auth.requestPasswordReset({ email, redirectTo? })` | Password reset flow |

---

## Data API methods (when full client is used)

| Method | Description |
|--------|-------------|
| `client.from('table').select(...)` | Fetch rows |
| `client.from('table').insert(...)` | Insert rows |
| `client.from('table').update(...).eq(...)` | Update rows |
| `client.from('table').delete().eq(...)` | Delete rows |
| `.eq(column, value)` / `.neq()` / `.gt()` / `.lt()` / `.like()` / `.in()` etc. | Filters |
| `.order(column, { ascending })` | Sort |
| `.limit(n)` | Limit results |

---

## Summary

| Piece | Official | AFENDA |
|-------|----------|--------|
| Install | `npm install @neondatabase/neon-js` | Catalog in `pnpm-workspace.yaml`; dependency in `apps/web` |
| Auth URL | `VITE_NEON_AUTH_URL` (Vite) or equivalent | `NEXT_PUBLIC_NEON_AUTH_URL` (Next.js) |
| Data API URL | `VITE_NEON_DATA_API_URL` (optional) | `NEXT_PUBLIC_NEON_DATA_API_URL` (optional) |
| Auth-only client | `createAuthClient(url)` from `@neondatabase/neon-js/auth` | `neonAuthClient` in `apps/web/src/lib/neon-js-client.ts` |
| Full client | `createClient({ auth: { url }, dataApi: { url } })` | `neonClient` in `apps/web/src/lib/neon-js-client.ts` (when both URLs set) |

Server-side auth (getSession, signIn in Server Actions, API route handler) remains with **@neondatabase/auth** (Next.js server SDK) in `apps/web/src/lib/auth/server.ts`. The Neon JS SDK (`@neondatabase/neon-js`) is for **client-side** auth and optional Data API use.
