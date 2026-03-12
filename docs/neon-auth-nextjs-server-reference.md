# Neon Auth Next.js Server SDK — Reference

Official reference: [Neon Auth Next.js Server SDK](https://neon.com/docs/auth/reference/nextjs-server). This doc mirrors the SDK and notes AFENDA’s implementation. **Decisions below are validated against Next.js 16 official docs** (see [Next.js MCP](#nextjs-mcp-validation) section).

---

## Installation

```bash
npm install @neondatabase/auth@latest
# or: pnpm add @neondatabase/auth@latest
```

AFENDA: `@neondatabase/auth` is in the pnpm catalog and used by `apps/web`.

---

## Environment variables

Configure in **.env.local** (or .env):

| Variable | Required | Description |
|----------|----------|-------------|
| **NEON_AUTH_BASE_URL** | ✓ | Neon Auth server URL from Neon Console (no trailing slash) |
| **NEON_AUTH_COOKIE_SECRET** | ✓ | Secret for signing session cookies (32+ characters, HMAC-SHA256) |
| **BASE_URL** or **AUTH_URL** | ✓ for callbacks | App origin for absolute callback URLs (e.g. `https://yourapp.com` or `http://localhost:3000`) |
| **NEON_AUTH_SESSION_TTL** | — | Optional. Session cookie TTL in seconds (default 300). Set if sessions drop or refresh fails. |
| **NEON_AUTH_COOKIE_DOMAIN** | — | Optional. Cookie domain (e.g. `.example.com`) for cross-subdomain sessions. Set in production if redirects/cookies fail. |

Generate a secure secret:

```bash
openssl rand -base64 32
```

Example:

```env
NEON_AUTH_BASE_URL=https://your-neon-auth-url.neon.tech
NEON_AUTH_COOKIE_SECRET=your-secret-at-least-32-characters-long
BASE_URL=https://yourapp.com
# Optional when auth keeps failing:
# NEON_AUTH_SESSION_TTL=300
# NEON_AUTH_COOKIE_DOMAIN=.yourapp.com
```

Validate: `node scripts/validate-neon-auth-env.mjs`

---

## Next.js config verification checklist

Use this to confirm the app matches the Neon Auth + Next.js setup.

| Check | How to verify | AFENDA |
|-------|----------------|--------|
| **1. Package** | `@neondatabase/auth` in dependencies | `apps/web/package.json` — present (catalog or `@neondatabase/auth`) |
| **2. Env vars** | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ chars) | `node scripts/validate-neon-auth-env.mjs` (from repo root) |
| **3. createNeonAuth** | Called with `baseUrl` + `cookies.secret` | `apps/web/src/lib/auth/server.ts` — conditional on env |
| **4. auth.handler()** | Catch-all route `app/api/auth/[...path]/route.ts` | `apps/web/src/app/api/auth/[...path]/route.ts` — GET/POST, 503 fallback |
| **5. Proxy / middleware** | Cookie-based guard or `auth.middleware()` | `apps/web/proxy.ts` (cookie check); `middleware.ts` re-exports (auth server not Edge-safe) |
| **6. auth.getSession()** | Used in server code; session from cookies | `getSession()` in `lib/auth/server.ts` wraps `auth.getSession()` + `toAfendaSession()` |
| **7. force-dynamic** | Server Components using session export `dynamic = 'force-dynamic'` | Layouts/pages that call `auth()`: `(erp)/layout`, `(kernel)/governance/layout`, `(kernel)/admin/layout`, `portal/layout`, `app/page` |
| **8. next.config** | No special Neon Auth config required | `apps/web/next.config.ts` — no auth-specific options; rewrites for API proxy only |

**Quick run:**

```bash
# From repo root
node scripts/validate-neon-auth-env.mjs
pnpm --filter @afenda/web typecheck
```

---

## createNeonAuth(config)

Creates the unified auth instance (handler, middleware, getSession, signIn, signUp, signOut, etc.).

### Configuration reference

Complete configuration options for `createNeonAuth()`:

| Option | Type | Required | Default |
|--------|------|----------|---------|
| baseUrl | string | Yes | — |
| cookies.secret | string | Yes | — |
| cookies.sessionDataTtl | number | No | 300 |
| cookies.domain | string | No | undefined |

- **baseUrl:** Your Neon Auth server URL from the Neon Console (no trailing slash).
- **cookies.secret:** Secret for HMAC-SHA256 signing (32+ characters).
- **cookies.sessionDataTtl:** Cache TTL in seconds (session cookie cache).
- **cookies.domain:** For cross-subdomain sessions (e.g. `".example.com"`).

```ts
import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
```

**AFENDA:** `apps/web/src/lib/auth/server.ts` — we create the instance when env is set and pass optional params from environment:

- **baseUrl** — normalized (trailing slash stripped) so redirects and trusted-origin checks work.
- **cookies.sessionDataTtl** — set from `NEON_AUTH_SESSION_TTL` when present (default 300). Use when sessions drop or refresh fails.
- **cookies.domain** — set from `NEON_AUTH_COOKIE_DOMAIN` when present (e.g. `.example.com`). Use in production when cookies are not set or redirects fail.

### Best practice implementation

AFENDA applies the following so that `createNeonAuth` matches the configuration reference and stays secure:

| Practice | Implementation |
|----------|----------------|
| **baseUrl** | Trimmed and trailing slashes removed (`replace(/\/+$/, "")`) so redirects and trusted-origin checks work. |
| **cookies.secret** | Must be **32+ characters**; `isNeonAuthConfigured` is false if shorter, so no auth instance is created with a weak secret. |
| **cookies.sessionDataTtl** | When `NEON_AUTH_SESSION_TTL` is set, value is **clamped to 60–86400** seconds (1 min–24 h) before passing to the SDK. |
| **cookies.domain** | Trimmed; only passed when set. Use for cross-subdomain sessions (e.g. `.example.com`). |

**Validation:** Run `node scripts/validate-neon-auth-env.mjs` to verify required env (baseUrl, cookie secret 32+ chars / 32 bytes base64) and optional best practice:

- **NEON_AUTH_SESSION_TTL** — if set, must be 60–86400 seconds.
- **NEON_AUTH_COOKIE_DOMAIN** — if set, should start with `.` for subdomain cookie.

---

## Performance features

### Session caching

Session data is automatically cached in a **signed, HTTP-only cookie** to reduce API calls to the Auth Server by **95–99%**.

| Aspect | Detail |
|--------|--------|
| **Default cache TTL** | 5 minutes (300 seconds) |
| **Configuration** | `cookies.sessionDataTtl` in `createNeonAuth` (AFENDA: from `NEON_AUTH_SESSION_TTL` env) |
| **Expiration** | Automatic based on JWT `exp` claim |
| **Sign-out** | Synchronous cache clearing on sign-out |
| **Signing** | Secure HMAC-SHA256 (using `cookies.secret`) |

**AFENDA:** We pass `sessionDataTtl` when `NEON_AUTH_SESSION_TTL` is set in `lib/auth/server.ts`. Default 300s matches Neon’s default; increase if you need longer-lived cache or decrease for stricter freshness.

### Request deduplication

Multiple concurrent `getSession()` calls are **automatically deduplicated**:

- **Single network request** for concurrent calls (no thundering herd to the Auth Server).
- **~10× faster cold starts** when many components request session in parallel.
- **Lower server load** on the Auth Server.

```ts
// First call: Fetches from Auth Server
const { data: session } = await auth.getSession();

// Subsequent calls within TTL: Uses cached data (no API call)
const { data: session2 } = await auth.getSession();
```

**AFENDA:** Our `getSession()` in `lib/auth/server.ts` wraps `auth.getSession()` and then `toAfendaSession()`. Deduplication applies to the underlying Neon Auth `getSession()`; the AFENDA bridge runs after the cached session is returned.

---

## auth.handler()

Returns **GET** and **POST** handlers for the Neon Auth API proxy.

- **Route:** `app/api/auth/[...path]/route.ts` (catch-all).
- Handles: sign in/up, OAuth callbacks, session, email verification, password reset.

**AFENDA:** `apps/web/src/app/api/auth/[...path]/route.ts` — we export `GET` and `POST` from `auth?.handler()` with a 503 fallback when auth is not configured.

```ts
// app/api/auth/[...path]/route.ts
import { auth } from '@/lib/auth/server';

export const { GET, POST } = auth.handler();
```

---

## auth.middleware(options)

Creates Next.js middleware that:

- Validates session cookies
- Redirects unauthenticated users to `loginUrl`
- Refreshes session tokens
- Provides session data to server components

**Parameters:**

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| loginUrl | string | | `/auth/sign-in` |

**Official example:**

```ts
// middleware.ts
import { auth } from '@/lib/auth/server';

export default auth.middleware({
  loginUrl: '/auth/sign-in'
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

**AFENDA:** We do **not** use `auth.middleware()` in the Edge. Our `lib/auth/server` module uses DB/drizzle for `toAfendaSession()`, so it is not Edge-safe. Instead, `apps/web/proxy.ts` does a lightweight session check (known cookie names) and redirects to `/auth/signin`. Full session resolution (Neon + AFENDA principal/org) runs in server components/layouts. To adopt `auth.middleware()` you’d need an Edge-safe auth module that only uses `createNeonAuth` (no DB).

---

## auth.getSession() — official pattern vs AFENDA

**Official (Neon docs):** Server Components that use `auth.getSession()` must export `dynamic = 'force-dynamic'` because session data depends on cookies.

```ts
// app/dashboard/page.tsx
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return <div>Not authenticated</div>;
  }

  return <h1>Welcome, {session.user.name}</h1>;
}
```

**AFENDA equivalent:** We use `auth()` from `@/auth`, which calls `getSession()` in `lib/auth/server`. `getSession()` internally calls `auth.getSession()` then `toAfendaSession()` (Neon identity → AFENDA org/roles). So we get the same guarantee (session from cookies + force-dynamic) with an enriched session shape.

| Official | AFENDA |
|----------|--------|
| `auth` from `@/lib/auth/server` | `auth` from `@/auth` (re-exports session via `getSession()` from server) |
| `const { data: session } = await auth.getSession()` | `const session = await auth()` |
| `session?.user` (Neon user) | `session?.user` (same; plus `session.affiliation.orgId`, `roles`, `permissions`) |
| `export const dynamic = 'force-dynamic'` | Same; on every layout/page that uses `auth()` |

**Where we set force-dynamic:** `(erp)/layout.tsx`, `(kernel)/governance/layout.tsx`, `(kernel)/admin/layout.tsx`, `portal/layout.tsx`, `app/page.tsx`, and governance sub-pages that use session. API routes are dynamic by default.

**Direct `auth.getSession()`:** Only used in `lib/auth/server.ts` inside `getSession()` and in `app/api/debug-session/route.ts` for diagnostics. All app UI uses `auth()` or `getSession()`.

### Server Actions (official pattern)

**Official (Neon docs):** In Server Actions that require an authenticated user, call `auth.getSession()` and redirect if no session.

```ts
// app/actions.ts
'use server';
import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function updateProfile(formData: FormData) {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Update user profile...
}
```

**AFENDA equivalent:** Use `auth()` from `@/auth` (returns our session or null); redirect to `/auth/signin` if missing.

```ts
'use server';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function updateProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // session.user, session.affiliation.orgId, session.affiliation.permissions...
}
```

Protected Server Actions (e.g. password change, MFA setup) should follow this pattern so the action fails fast with a redirect instead of relying only on the API or layout.

### Route Handlers / API routes (official pattern)

**Official (Neon docs):** In Route Handlers that require an authenticated user, call `auth.getSession()` and return 401 if no session.

```ts
// app/api/user/route.ts
import { auth } from '@/lib/auth/server';

export async function GET() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ user: session.user });
}
```

**AFENDA equivalent (inline):** Use `auth()` from `@/auth`; return 401 (or 403 for forbidden) when there is no session.

```ts
// app/api/user/route.ts (or app/api/private/me/route.ts)
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
```

**AFENDA alternative (wrapper):** You can also use `auth(handler)` so the handler receives `req.auth` and you only run logic when session exists. See `apps/web/src/app/api/private/me/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const GET = auth(async function GET(req) {
  if (!req.auth?.user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ user: req.auth.user });
});
```

Route Handlers are dynamic by default, so no `force-dynamic` export is required.

---

## auth.signIn.email()

Sign in with email and password. Use in **Server Actions** for form-based authentication.

**Parameters:** `email` (string, required), `password` (string, required). Optional: `callbackURL` for redirect after success.

**Official (Neon docs):**

```ts
'use server';
import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const { data, error } = await auth.signIn.email({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) return { error: error.message };
  redirect('/dashboard');
}
```

**AFENDA equivalent (minimal, same shape as official):** When `auth` is configured, the call is identical. We use `auth` from `@/lib/auth/server` (exported as `neonAuth` in our action) and guard with `isNeonAuthConfigured` when needed.

```ts
'use server';
import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const { data, error } = await auth.signIn.email({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) return { error: error.message };
  redirect('/dashboard');
}
```

**AFENDA production:** `apps/web/src/app/auth/_actions/signin.ts` uses the same call with:

- **auth** from `@/lib/auth/server` as `neonAuth` (with null check when not configured)
- **Zod** validation before calling `neonAuth.signIn.email({ email, password, callbackURL })`
- **callbackURL** — we pass an **absolute URL** (e.g. `https://yourapp.com/app`) built from `getBaseUrl()` + path, so Neon Auth redirects and cookies work reliably. Relative paths can cause auth to keep failing.
- **Rate limiting** and **audit events** (attempt, success, failure)
- On **error:** `return buildFailureState(result.error.message)` (form state) instead of `return { error }`
- On **success:** `redirect(callbackUrlResolved)` (path only for Next.js)

So the core pattern matches: `auth.signIn.email` with **absolute callbackURL** → handle error → redirect on success.

---

## auth.signUp.email()

Create a new user account with email and password. Use in **Server Actions** for registration forms.

**Parameters:**

| Parameter   | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| email       | string | ✓        | User's email                   |
| password    | string | ✓        | User's password                |
| name        | string | ✓        | User's display name            |
| callbackURL | string |          | Optional. Where to redirect after sign-up; use absolute URL in production. |

**Official (Neon docs) — minimal:**

```ts
const { data, error } = await auth.signUp.email({
  email: 'user@example.com',
  password: 'secure-password',
  name: 'John Doe',
});
```

With redirect after sign-up (optional):

```ts
const { data, error } = await auth.signUp.email({
  email: 'user@example.com',
  password: 'secure-password',
  name: 'John Doe',
  callbackURL: '/dashboard',  // optional; use absolute URL in production
});
```

**AFENDA:** `apps/web/src/app/auth/_actions/signup.ts` calls `neonAuth.signUp.email()` with:

- **name** — from form field `fullName` (required by Neon Auth).
- **email**, **password** — validated via Zod `signUpSchema` (includes `confirmPassword` check).
- **callbackURL** — **absolute URL** built from `getBaseUrl()` + path (same as sign-in) so redirects and cookies work in production.

On success we optionally call `signIn.email` and redirect; on error we return form state and publish audit events.

---

## auth.signIn.social()

Sign in with an OAuth provider (e.g. Google, GitHub).

**Parameters:**

| Parameter     | Type   | Required | Description                    |
|---------------|--------|----------|--------------------------------|
| provider      | string | ✓        | e.g. `"google"`, `"github"`   |
| callbackURL   | string |          | Where to redirect after sign-in |

**Official (Neon docs):**

```ts
const { data, error } = await auth.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
});
```

Call from a Server Action or server code; pass `provider` and optionally `callbackURL`. The SDK redirects to the provider; after OAuth, the user is sent back to your app and the session cookie is set.

**AFENDA:** We use an **absolute** `callbackURL` (e.g. `https://your-origin.com/dashboard`) instead of a relative `/dashboard` so Neon Auth can redirect back to our origin and set the session cookie correctly; relative URLs can fail with trusted-origin validation. We use it in `apps/web/auth.ts` for the high-level `signIn(provider, options)` used by sign-in buttons:

```ts
// auth.ts — when provider is "google" or "github"
const absoluteCallbackURL = `${getBaseUrl()}${destination}`; // absolute URL required for Neon trusted origins

const result = await neonAuth.signIn.social({
  provider: _provider,           // "google" | "github"
  callbackURL: absoluteCallbackURL,
  disableRedirect: true,         // we redirect manually to result.data?.url (OAuth URL)
});

if (result.error) throw new Error(result.error.message);
redirect(result.data?.url ?? destination);
```

We use **absolute** `callbackURL` (e.g. `https://localhost:3000/app`) so Neon Auth can redirect back to our origin and set the cookie; relative URLs can break OAuth callback and trusted-origin checks. Client-side OAuth buttons call `signIn('google')` or `signIn('github')` from `@/auth`, which runs this server-side.

**OAuth for signup:** Neon Auth / Better Auth does not have a separate `signUp.social()`. The same `signIn.social()` flow is used for both **sign-in** and **sign-up**: the first time a user completes OAuth with Google or GitHub, a new user is created in `neon_auth.user` (signup); on later visits they sign in. No extra parameter is required to allow signup. For new OAuth users to get an AFENDA session, the DB trigger `sync_neon_auth_user_to_afenda_identity` must run on `neon_auth.user` INSERT so that `iam_principal` (and default org/membership) exist when `toAfendaSession()` runs. See [Neon Auth MCP validation — New OAuth users and AFENDA identity](neon-auth-mcp-validation.md#4-new-oauth-users-and-afenda-identity).

---

## auth.emailOtp.sendVerificationOtp()

Send a one-time password via email. Available when Email OTP authentication is enabled. Use before `auth.signIn.emailOtp()` so the user can enter the code they receive.

**Parameters:**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| email     | string | ✓        | Email address to send the OTP to |

**Official (Neon docs):**

```ts
const { data, error } = await auth.emailOtp.sendVerificationOtp({
  email: 'user@example.com',
});
```

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/email-otp.ts` as `sendEmailOtpAction`. It validates the email with Zod (`emailOtpSendSchema`), calls `auth.emailOtp.sendVerificationOtp({ email })` with `auth` from `@/lib/auth/server`, and returns success state with the email for the next step. Used by the **Sign in with code** flow at `/auth/signin-with-code`: step 1 sends the code (this API), step 2 the user enters the OTP and submits to `signInWithEmailOtpAction` (`auth.signIn.emailOtp`).

---

## auth.emailOtp.verifyEmail()

Verify email with OTP code. Use when the user has received a verification OTP (e.g. from `sendVerificationOtp` or `sendVerificationEmail`) and must submit the code to mark their email as verified.

**Parameters:**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| email     | string | ✓        | Email address to verify |
| otp       | string | ✓        | One-time code from email |

**Official (Neon docs):**

```ts
const { data, error } = await auth.emailOtp.verifyEmail({
  email: 'user@example.com',
  otp: '123456',
});
```

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/email-otp.ts` as `verifyEmailWithOtpAction`. It validates with Zod (`emailOtpVerifySchema`), calls `auth.emailOtp.verifyEmail({ email, otp })` with `auth` from `@/lib/auth/server`, and returns success or failure state. Used on the Security settings page in the "Verify email with code" card (email + OTP form) after the user has requested a verification email.

---

## auth.signIn.emailOtp()

Sign in with email OTP (one-time password). Call `auth.emailOtp.sendVerificationOtp({ email })` first to send the code, then use this method with the code the user received.

**Parameters:**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| email     | string | ✓        | User's email       |
| otp       | string | ✓        | One-time code from email |

**Official (Neon docs):**

```ts
const { data, error } = await auth.signIn.emailOtp({
  email: 'user@example.com',
  otp: '123456',
});
```

**AFENDA:** `signInWithEmailOtpAction` in `apps/web/src/app/auth/_actions/email-otp.ts` calls `auth.signIn.emailOtp({ email, otp })` and redirects to `callbackUrl` or `/app` on success. Paired with `sendEmailOtpAction` (sendVerificationOtp) in the `/auth/signin-with-code` flow.

---

## auth.signOut()

Sign out the current user. Clears session and authentication tokens.

**Official (Neon docs):**

```ts
'use server';
import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  await auth.signOut();
  redirect('/auth/sign-in');
}
```

**AFENDA:** We wrap Neon Auth in `apps/web/auth.ts`: `signOut(options?)` calls `neonAuth.signOut()` when configured, then redirects to a configurable destination (default `/auth/signin?signedOut=success`). Server Actions use this via `signOut({ redirectTo: '...' })`. The sign-out page and session control call `signOutAction` in `apps/web/src/app/auth/_actions/signout.ts`, which publishes an audit event (`auth.signout`) then calls `signOut({ redirectTo: '/auth/signin?signedOut=success' })`.

---

## auth.updateUser()

Update the current user's profile. Password changes are not supported here; use the password reset flow for security.

**Parameters:**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| name      | string \| undefined | | User's display name |
| image     | string \| undefined | | User's profile image URL |

**Official (Neon docs):**

```ts
const { data, error } = await auth.updateUser({
  name: 'Jane Doe',
  image: 'https://example.com/avatar.jpg',
});
```

Use in a Server Action after a session check (e.g. `const { data: session } = await auth.getSession(); if (!session?.user) redirect('/auth/sign-in');`), then call `auth.updateUser({ name, image })` and handle `error` or redirect on success.

**AFENDA:** The client SDK exposes profile updates in `apps/web/src/lib/auth/client.ts` as `updateProfile = authClient.updateUser`. For server-side use (e.g. Server Actions), call `auth.updateUser({ name, image })` with `auth` from `@/lib/auth/server`, after confirming the session with `await auth.getSession()` or `auth()` from `@/auth`. Password updates use the separate password-reset / change-password flow (e.g. governance settings security actions).

---

## auth.changePassword()

Change the current user's password. Requires the current password.

**Parameters:**

| Parameter            | Type    | Required | Description                                      |
|----------------------|---------|----------|--------------------------------------------------|
| currentPassword      | string  | ✓        | User's current password                          |
| newPassword          | string  | ✓        | New password to set                              |
| revokeOtherSessions  | boolean |          | If true, invalidate other sessions after change |

**Official (Neon docs):**

```ts
const { data, error } = await auth.changePassword({
  currentPassword: 'old-password',
  newPassword: 'new-password',
  revokeOtherSessions: true,
});
```

Use in a Server Action after a session check. On success, the session may be refreshed; handle `error` or redirect as needed.

**AFENDA:** The Security settings page uses `changePasswordAction` in `apps/web/src/app/(kernel)/governance/settings/security/actions.ts`, which calls the API client `PATCH /v1/me/password`. To use Neon Auth directly in a Server Action, call `auth.changePassword({ currentPassword, newPassword, revokeOtherSessions })` with `auth` from `@/lib/auth/server` after `requireSession()` (or `auth()` from `@/auth`).

---

## auth.sendVerificationEmail()

Send email verification to the current user. Use when the user must verify their email (e.g. after sign-up or when changing email).

**Parameters:**

| Parameter   | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| callbackURL | string |          | Optional. Where to redirect after verification; use absolute URL in production. |

**Official (Neon docs):**

```ts
const { data, error } = await auth.sendVerificationEmail({
  callbackURL: '/dashboard',
});
```

Use in a Server Action after a session check. For production, pass an absolute `callbackURL` (e.g. `${getBaseUrl()}/dashboard`) so the verification link redirects correctly.

**AFENDA:** Configured in app: Security settings (`/governance/settings/security`) has an "Email verification" section with "Send verification email". The action `sendVerificationEmailAction` in `apps/web/src/app/auth/_actions/send-verification-email.ts` calls `auth.sendVerificationEmail({ email: session.user.email, callbackURL })` with `auth` from `@/lib/auth/server` and builds `callbackURL` from `getBaseUrl()` (e.g. `/app`).

---

## auth.deleteUser()

Delete the current user account. This action is irreversible.

**Official (Neon docs):**

```ts
const { data, error } = await auth.deleteUser();
```

Use in a Server Action after a session check. On success, sign out and redirect (e.g. to `/auth/signin`). Handle `error` for failure cases.

**AFENDA:** Implemented in app: Security settings (`/governance/settings/security`) has a "Delete account" danger-zone section. The action `deleteUserAction` in `apps/web/src/app/auth/_actions/delete-user.ts` calls `auth.deleteUser()` with `auth` from `@/lib/auth/server`, then `auth.signOut()` and `redirect("/auth/signin?accountDeleted=1")`. The UI (`DeleteAccountClient.tsx`) requires the user to type "DELETE" to confirm before submitting.

---

## auth.listSessions()

List all active sessions for the current user.

**Official (Neon docs):**

```ts
const { data, error } = await auth.listSessions();
```

Use in a Server Action or API route after a session check. `data` is typically an array of session objects (e.g. `id`, `userId`, `expiresAt`). Handle `error` for failure cases.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/list-sessions.ts` as `listSessionsAction()`. It requires an authenticated session, calls `auth.listSessions()` with `auth` from `@/lib/auth/server`, and returns `{ ok: true, sessions }` or `{ ok: false, error }`. The Security settings page has an "Active sessions" section (`ListSessionsClient`) with a "Load sessions" button that calls the action and displays the list (session id snippet and expiry).

---

## auth.revokeSession()

Revoke a specific session. Better Auth expects the **session token** (the value stored in the session cookie), not the session id.

**Parameters:**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| token     | string | ✓        | Session token to revoke (from the session record; listSessions may or may not return it for security) |

**Official (Better Auth):**

```ts
await authClient.revokeSession({
  token: "session-token",
});
```

Server-side (Neon Auth SDK): `auth.revokeSession({ token })` with `auth` from `@/lib/auth/server`. Use in a Server Action after a session check. Handle `error` for failure cases.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/list-sessions.ts` as `revokeSessionAction(sessionToken)`. It calls `auth.revokeSession({ token })` with `auth` from `@/lib/auth/server` (correct parameter name for Better Auth). The "Active sessions" card (`ListSessionsClient`) shows a "Revoke" button per session when the session has a `token` or `id`; we pass `session.token ?? session.id` so revoke works when listSessions returns tokens, or when the backend accepts id as token.

---

## auth.revokeOtherSessions()

Revoke all sessions except the current one. Use to sign out all other devices or browsers.

**Official (Neon docs):**

```ts
const { data, error } = await auth.revokeOtherSessions();
```

No parameters. Use in a Server Action after a session check. Handle `error` for failure cases.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/list-sessions.ts` as `revokeOtherSessionsAction()`. It calls `auth.revokeOtherSessions()` with `auth` from `@/lib/auth/server`. The "Active sessions" card (`ListSessionsClient`) has a "Revoke all other sessions" button that calls the action; on success the list is cleared (user can load again to see only the current session).

---

## auth.organization.create()

Create a new organization. Available when the **organizations plugin** is enabled.

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| name      | string | ✓        | Organization display name     |
| slug      | string |          | URL-friendly identifier (e.g. `my-org`) |

**Official (Neon docs):**

```ts
const { data, error } = await auth.organization.create({
  name: 'My Organization',
  slug: 'my-org',
});
```

Use in a Server Action after a session check. The creating user is typically added as a member. Handle `error` for validation or permission failures.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/create-organization.ts` as `createOrganizationAction(_prevState, formData)`. It validates input with `organizationCreateSchema` (name required, slug optional, slug format: lowercase letters, numbers, hyphens), then calls `auth.organization.create({ name, slug })` with `auth` from `@/lib/auth/server`. The **Settings → Organizations** page (`/governance/settings/organizations`) has a "Create organization" card (`CreateOrganizationClient`) with a form (name, optional slug); on success the page calls `router.refresh()` so the workspace selector can show the new org.

---

## auth.organization.list()

List the current user's organizations. Available when the **organizations plugin** is enabled.

No parameters. Use in a Server Action or Server Component after a session check. Returns an array of organizations the user belongs to.

**Official (Neon docs):**

```ts
const { data, error } = await auth.organization.list();
```

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/create-organization.ts` as `listOrganizationsAction()`. It calls `auth.organization.list()` with `auth` from `@/lib/auth/server` and returns `{ ok: true, organizations }` or `{ ok: false, error }`. The **Settings → Organizations** page has a "Your organizations" card (`ListOrganizationsClient`) with a "Load organizations" button that calls the action and displays name and slug for each org.

---

## auth.organization.inviteMember()

Invite a member to an organization by email. Available when the **organizations plugin** is enabled.

| Parameter       | Type   | Required | Description                    |
|-----------------|--------|----------|--------------------------------|
| organizationId  | string | ✓        | Organization UUID to invite into |
| email           | string | ✓        | Invitee email address          |
| role            | string |          | Role to assign (e.g. `member`)  |

**Official (Neon docs):**

```ts
const { data, error } = await auth.organization.inviteMember({
  organizationId: 'org-id',
  email: 'member@example.com',
  role: 'member',
});
```

Use in a Server Action after a session check. The inviter must have permission to invite in that organization. Handle `error` for validation or permission failures.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/create-organization.ts` as `inviteMemberAction(_prevState, formData)`. Input is validated with `organizationInviteMemberSchema` (organizationId UUID, email, optional role), then `auth.organization.inviteMember({ organizationId, email, role })` is called with `auth` from `@/lib/auth/server`. The **Settings → Organizations** page has an "Invite member" card (`InviteMemberClient`): user loads organizations, selects one, enters email and optional role, and submits; success/error feedback is shown.

---

## auth.admin.listUsers()

List all users. **Available for users with admin role.**

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| limit     | number |          | Max number of users to return (e.g. 100) |
| offset    | number |          | Pagination offset (e.g. 0)     |

**Official (Neon docs):**

```ts
const { data, error } = await auth.admin.listUsers({
  limit: 100,
  offset: 0,
});
```

Use in a Server Action after checking that the session user has admin role. Handle `error` for permission or configuration failures.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/list-users.ts` as `listUsersAction({ limit?, offset? })`. It requires a signed-in user and checks `session.user.roles.includes("admin")`; if not admin, returns `{ ok: false, error: "Admin role required to list users." }`. It calls `auth.admin.listUsers({ limit, offset })` with `auth` from `@/lib/auth/server` (limit default 100, max 500; offset default 0). The **Admin → Users** page (`/admin/users`) checks admin role and renders `ListUsersClient`, which lets the user set limit/offset and click "Load users" to display the result in a table (email, name, created).

---

## auth.admin.banUser()

Ban a user. **Available for users with admin role.**

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| userId    | string | ✓        | User ID to ban                 |
| reason    | string | ✓        | Reason for the ban (e.g. violation of terms) |

**Official (Neon docs):**

```ts
const { data, error } = await auth.admin.banUser({
  userId: 'user-id',
  reason: 'Violation of terms',
});
```

Use in a Server Action after checking that the session user has admin role. Handle `error` for permission or configuration failures.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/list-users.ts` as `banUserAction(userId, reason)`. It requires admin role (same check as list users), validates input with `adminBanUserSchema` (userId required, reason required, max 500 chars), then calls `auth.admin.banUser({ userId, reason })` with `auth` from `@/lib/auth/server`. The **Admin → Users** page table has a "Ban" button per row (hidden for the current user). Clicking it opens an AlertDialog to enter a required reason; on success the user is removed from the local list.

---

## auth.admin.setRole()

Set a user's role. **Available for users with admin role.**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| userId    | string | ✓        | User ID to update  |
| role      | string | ✓        | Role to set (e.g. `admin`, `member`) |

**Official (Neon docs):**

```ts
const { data, error } = await auth.admin.setRole({
  userId: 'user-id',
  role: 'admin',
});
```

Use in a Server Action after checking that the session user has admin role. Handle `error` for permission or configuration failures.

**AFENDA:** Implemented in `apps/web/src/app/auth/_actions/list-users.ts` as `setRoleAction(userId, role)`. It requires admin role, validates input with `adminSetRoleSchema` (userId and role required, role max 64 chars), then calls `auth.admin.setRole({ userId, role })` with `auth` from `@/lib/auth/server`. The **Admin → Users** page table has a "Set role" button per row. Clicking it opens a Dialog to enter the role (e.g. admin, member); on success the dialog closes.

---

## Next.js MCP validation

Decisions above are aligned with **Next.js 16 official documentation** (via Next.js DevTools MCP: `nextjs_docs`).

### Authentication guide ([docs/app/guides/authentication](https://nextjs.org/docs/app/guides/authentication))

- Recommends using an **auth library** (e.g. Better Auth / Neon Auth) for session management and OAuth.
- **Optimistic checks with Proxy:** “only read the session from the cookie (optimistic checks), and **avoid database checks** to prevent performance issues.” AFENDA’s `proxy.ts` does exactly that: cookie-only check for known session cookie names; no DB in proxy.
- **Secure checks** belong in a **Data Access Layer (DAL)** / server components; we do full session resolution (Neon + AFENDA identity) in `lib/auth/server` and page-level code, not in proxy.

### Route Handlers ([docs/app/getting-started/route-handlers](https://nextjs.org/docs/app/getting-started/route-handlers))

- Route Handlers live in `route.js|ts`; GET/POST are supported and not cached by default.
- Our `app/api/auth/[...path]/route.ts` exporting `GET` and `POST` from `auth.handler()` matches this convention.

### Proxy (formerly middleware) ([docs/app/api-reference/file-conventions/proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy))

- In **Next.js 16** the `middleware` file convention is **deprecated and renamed to `proxy`**. The file should be `proxy.ts` (or `proxy.js`) at the project root and must export a function as default or named `proxy`.
- AFENDA: auth logic lives in `apps/web/proxy.ts` with a **named export `proxy`**; `middleware.ts` re-exports it as `middleware` for compatibility. Proxy runs before routes; we use it only for cookie-based redirects (no shared modules/DB).
- Official guidance: “You should not attempt relying on shared modules or globals” in Proxy; pass information via headers, cookies, rewrites, redirects, or URL. Our proxy only reads cookies and returns redirects/next — no import of `lib/auth/server`.

---

## Troubleshooting: Neon Auth keeps failing

If sign-in, OAuth, or session redirects keep failing, apply these (all are implemented or configurable):

| Check | Implementation |
|-------|----------------|
| **1. Absolute callback URL** | **Required.** Both `signIn.email` and `signIn.social` receive an absolute `callbackURL` (e.g. `https://yourapp.com/app`). Relative paths break trusted-origin and cookie setting. We build it from `getBaseUrl()` in `auth.ts`, `signin.ts`, and `signup.ts`. |
| **2. baseUrl has no trailing slash** | **Required.** `NEON_AUTH_BASE_URL` is normalized in `lib/auth/server.ts` (trailing slash stripped). A trailing slash can break redirects and JWKS/session endpoints. |
| **3. Trusted origins in Neon Console** | **Required.** In Neon Console → your project → Auth, add your app origin (e.g. `https://yourapp.com`, `http://localhost:3000`) to trusted origins. Without this, OAuth and callbacks can be rejected. |
| **4. BASE_URL / AUTH_URL set** | **Required for callbacks.** Used by `getBaseUrl()` to build absolute callback URLs. Set to your app's public URL (e.g. `https://yourapp.com` or `http://localhost:3000`). |
| **5. Cookie secret 32+ characters** | **Required.** `NEON_AUTH_COOKIE_SECRET` must be at least 32 characters (HMAC-SHA256). Use `openssl rand -base64 32`. |
| **6. Session TTL (optional)** | If sessions drop or refresh fails, set `NEON_AUTH_SESSION_TTL` (seconds, e.g. `300`). Passed to `createNeonAuth` as `cookies.sessionDataTtl`. |
| **7. Cookie domain (optional)** | In production with subdomains, set `NEON_AUTH_COOKIE_DOMAIN` (e.g. `.yourapp.com`) so the session cookie is set for the whole domain. Passed to `createNeonAuth` as `cookies.domain`. |

**GitHub or Google OAuth fails:** When you click "Sign in with GitHub" (or Google) and see an error, the message is now shown on the sign-in page (via `?oauth_error=...`). Common causes:

1. **Neon Console → Auth:** Ensure the **GitHub** (or Google) provider is enabled and your **OAuth app credentials** (Client ID / Client Secret) are set. For production, use your own OAuth app; see [Neon Auth production checklist](neon-auth-production%20checklist.md) (OAuth credentials).
2. **GitHub OAuth App:** In GitHub → Settings → Developer settings → OAuth Apps, the **Authorization callback URL** must point to your **Neon Auth** callback (e.g. `https://your-neon-auth-url.neon.tech/api/auth/callback/github`), not to your app URL. Get the exact callback URL from Neon Console → Auth.
3. **Trusted domains:** Your app origin (e.g. `http://localhost:3000` or `https://your-domain.com`) must be in Neon Console → Auth → trusted domains so Neon can redirect back with the session cookie.
4. **BASE_URL / AUTH_URL:** Must match the URL you use in the browser (e.g. `http://localhost:3000` in dev) so the callback URL we send to Neon is correct.

- **Config file:** Use `.env.config` (or `.env`) at repo root; copy to `.env` for the app if your setup expects it. Ensure `BASE_URL` and `AUTH_URL` match the origin (e.g. `https://nexuscanon.com` in production).
- **Validate:** Run `node scripts/validate-neon-auth-env.mjs` to verify required env vars. After changing env, restart the dev server.
- **Neon MCP (production):** Run `node scripts/neon-mcp-production-context.mjs` to print `projectId` / `branchId` for Cursor's Neon MCP; set `NEON_API_KEY` in MCP config. See [Neon Auth MCP validation — Production](neon-auth-mcp-validation.md#production-initialize-neon-mcp).

---

## Summary

| Piece | Official | AFENDA |
|-------|----------|--------|
| Install | `@neondatabase/auth@latest` | Catalog in `apps/web` |
| Env | .env.local, base URL + cookie secret | Same; + optional `NEON_AUTH_SESSION_TTL`, `NEON_AUTH_COOKIE_DOMAIN`; validated by script |
| createNeonAuth | lib/auth/server.ts | `apps/web/src/lib/auth/server.ts` — baseUrl normalized, optional sessionDataTtl + domain from env |
| auth.handler() | app/api/auth/[...path]/route.ts | Same; 503 when not configured |
| auth.middleware() | middleware.ts default export | Custom **proxy** in `proxy.ts` (cookie-only check) — auth server not Edge-safe |
| callbackURL | Optional relative or absolute | **Always absolute** in signIn.email, signIn.social, signUp.email (from `getBaseUrl()`) |
| Performance | Session cache (cookie, 5 min TTL), request deduplication for getSession() | Same; TTL configurable via `NEON_AUTH_SESSION_TTL`; see [Performance features](#performance-features) |

**Related:** For **client-side** Neon Auth and optional Data API, see [Neon JavaScript SDK reference](neon-javascript-sdk-reference.md) (`@neondatabase/neon-js`, `apps/web/src/lib/neon-js-client.ts`). For **OAuth configuration** (Google/GitHub, routes, Neon Console, and comparison with the [Neon Branches Visualizer](https://github.com/neondatabase/neon-branches-visualizer) reference repo), see [Neon OAuth configuration plan](neon-oauth-configuration-plan.md).

**Next.js 16:** Use Next.js DevTools MCP (`init` then `nextjs_docs` with path from `nextjs-docs://llms-index`) to re-validate or extend this reference against the latest docs.
