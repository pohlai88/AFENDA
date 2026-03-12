---
name: neon-auth-integration
description: Complete Neon Auth integration setup for AFENDA, addressing gaps in current codebase. Covers provisioning, server SDK, client SDK, bearer token verification, and security module integration.
---

# Neon Auth Integration for AFENDA

## Quick Reference: Vite Quickstart vs. AFENDA Next.js Implementation

The official Neon Auth quickstart is for **Vite + React Router** (simple client-centric). AFENDA uses **Next.js 16 App Router** (server + client architecture). This skill adapts the official patterns for Next.js.

| Aspect | Official Quickstart | AFENDA Skill |
|--------|-------------------|--------------|
| **Framework** | Vite + React Router | Next.js 16 App Router |
| **Server SDK** | None (client-only) | `@neondatabase/auth/next/server` ✅ |
| **Client SDK** | `@neondatabase/neon-js` | `@neondatabase/neon-js` ✅ |
| **Env var** | `VITE_NEON_AUTH_URL` | `NEXT_PUBLIC_NEON_AUTH_URL` + `NEON_AUTH_BASE_URL` |
| **Auth Init** | `createAuthClient()` in `src/lib/auth.ts` | `createNeonAuth()` in `src/lib/auth/server.ts` |
| **Route Handler** | None (Vite doesn't need it) | `app/api/auth/[...auth]/route.ts` (Next.js pattern) |
| **Session API** | `authClient.useSession()` (hook) | `auth.api.getSession()` (server) |
| **UI Components** | AuthView, AccountView pre-built | Same + custom Next.js Page wrappers |
| **Multi-tenancy** | Not in quickstart | ✅ Bridged via `toAfendaSession()` |
| **API Bearer Tokens** | Not covered | ✅ Full JWKS + JWT verification |
| **RLS Policies** | Not covered | ✅ Org isolation patterns |

**Key Insight:** All official Neon Auth APIs are identical; we just adapt the framework-specific setup for Next.js and add AFENDA's multi-tenancy layer.

---

## Overview

Neon Auth is a managed authentication service built on Better Auth. This skill provides:
- Complete provisioning workflow for AFENDA's Neon project
- Server-side (Next.js) and client-side SDK integration
- Bearer token verification in Fastify API
- Integration patterns with 67 existing security/governance modules
- Database schema alignment (neon_auth ↔ auth-* security tables)
- Branching-aware auth during preview deployments

**Status:** In-progress migration from NextAuth v5 → Neon Auth. Current state:
- ✅ NextAuth removed from runtime
- ⚠️ Temporary dev shim in place (`apps/web/auth.ts`)
- ❌ Neon Auth not yet provisioned
- ❌ Server/client SDKs not wired
- ❌ Bearer token verification stubbed

---

## Current Omissions Checklist

- [ ] **Database schema:** No `neon_auth` schema provisioned in Neon project
- [ ] **Server SDK:** No `@neondatabase/auth` Server SDK instantiation
- [ ] **Server handler:** No `apps/web/src/lib/auth/server.ts` or route handler
- [ ] **Client SDK:** No `@neondatabase/neon-js/auth` imported or initialized
- [ ] **API bearer verification:** Stub in `apps/api/src/plugins/auth.ts` line 56
- [ ] **Cookie handling:** Placeholder logic in `apps/web/src/lib/api-client.ts`
- [ ] **Session context:** No integration with existing `resolvePrincipalContext`
- [ ] **RLS policies:** No Postgres policies linking `neon_auth.user` to `auth-*` tables
- [ ] **Multi-tenancy:** No org context propagation from Neon Auth session
- [ ] **OWNERS.md:** No api/web/core updated with Neon Auth files

---

## Phase 0: Prerequisites

### 0.1 Understand Official Neon Auth Architecture

**Important:** Neon Auth documentation provides two primary quickstarts:

1. **Vite + React Router** (Simple, client-centric)
   - Uses unified SDK: `@neondatabase/neon-js`
   - Env var: `VITE_NEON_AUTH_URL`
   - Single client setup file
   - Pre-built UI components handle auth entirely

2. **Next.js App Router** (This skill — More control)
   - Uses server SDK: `@neondatabase/auth/next/server`
   - Uses client SDK: `@neondatabase/neon-js`
   - Separate server/client modules
   - Custom route handlers + components
   - Better for multi-tenancy and Fastify API integration

**AFENDA uses Next.js, so follow this skill's approach (not the Vite quickstart).**

### 0.2 Environment Validation

Verify AFENDA env schema accepts Neon Auth variables:

**Current state:** `packages/core/src/kernel/infrastructure/env.ts`
- ✅ `NEON_AUTH_BASE_URL` optional (url) — **Neon Auth endpoint root URL**
- ✅ `NEON_AUTH_COOKIE_SECRET` optional (≥16 chars) — **Session cookie encryption**
- ❌ `NEXT_PUBLIC_NEON_AUTH_URL` missing — **Add this for client SDK**

**Action:** Add to `WebEnvSchema`:
```typescript
// packages/core/src/kernel/infrastructure/env.ts
export const WebEnvSchema = z.object({
  // ... existing ...
  NEXT_PUBLIC_NEON_AUTH_URL: z
    .string()
    .url("NEXT_PUBLIC_NEON_AUTH_URL must be a valid URL")
    .optional()
    .describe("Neon Auth endpoint URL for client-side SDK (same as NEON_AUTH_BASE_URL)"),
});
```

**Add to `.env.example`:**
```bash
# Neon Auth — from Neon Console
NEON_AUTH_BASE_URL=https://your-project.neonauth.region.aws.neon.tech/your-database/auth
NEXT_PUBLIC_NEON_AUTH_URL=https://your-project.neonauth.region.aws.neon.tech/your-database/auth
NEON_AUTH_COOKIE_SECRET=your-32-byte-base64-encoded-secret
```

### 0.3 Neon Project Readiness

Prerequisites:
- ✅ Neon project created (https://console.neon.tech)
- ✅ Database provisioned with name (default: `neondb`)
- ✅ Project deployed in **AWS region only** (Neon Auth not on Azure yet)
- ✅ **No IP Allow lists enabled** (blocks Neon Auth)
- ✅ **No Private Networking enabled** (blocks Neon Auth)
- ✅ Plan upgraded to: Free (60K MAU), Launch (1M MAU), or Scale (1M MAU+)

**Verify with neonctl:**
```bash
npm install -g neonctl
neonctl auth # Login to Neon
neonctl projects list
neonctl branches list --project-id <project-id>
```

### 0.4 Dependency Installation

```bash
# Server SDK for Next.js App Router
pnpm add -W @neondatabase/auth

# Unified client SDK (includes UI components)
pnpm add -W @neondatabase/neon-js

# Already installed, but verify
pnpm list zod
pnpm list react react-dom
```

**Compatibility Matrix:**
- `@neondatabase/auth`: Latest (Better Auth 1.4.18)
- `@neondatabase/neon-js`: Latest (includes `@neondatabase/auth/react/ui`)
- React: 19+ (AFENDA uses 19.1)
- Next.js: 16+ (AFENDA uses 16.1)

---

## Phase 1: Provision Neon Auth

### 1A. Via Neon Console (Easiest)

1. Open https://console.neon.tech
2. Navigate to your project
3. **Auth** tab → **Enable Neon Auth**
4. Select database and org context
5. Wait for `neon_auth` schema to be created

**Verification:**
```bash
# Query Neon project
psql $DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'neon_auth';"
# Should return: neon_auth
```

### 1B. Via Drizzle Introspection (For CI/CD)

After Neon Console enables auth, introspect the schema:

```bash
pnpm db:generate
# Drizzle will discover neon_auth schema tables:
# - neon_auth.user
# - neon_auth.session
# - neon_auth.account
# - neon_auth.verification
```

**Expected tables in `packages/db/src/schema/`:**
```
schema/
  neon-auth/
    neon-auth-accounts.ts      (OAuth provider accounts)
    neon-auth-sessions.ts      (Login sessions)
    neon-auth-users.ts         (User identities)
    neon-auth-verifications.ts (Email/2FA verification codes)
    relations.ts               (Foreign keys)
```

**Do NOT edit these files.** They are auto-generated and controlled by Neon Auth lifecycle.

---

## Phase 2: Server-Side SDK Setup (Next.js App Router)

### 2A. Create Server Auth Module

**File:** `apps/web/src/lib/auth/server.ts` (NEW)

This file instantiates the official Neon Auth server SDK per documented pattern.

```typescript
/**
 * Neon Auth Server SDK for Next.js App Router.
 * 
 * Official pattern from https://neon.com/docs/auth/quick-start/nextjs
 * 
 * This is the source of truth for:
 * - Route handler at /api/auth/[...auth]/route.ts
 * - Server-side session verification
 * - Cookie-based session management
 * 
 * Architecture:
 * - Neon Auth provides identity (user, session, OAuth)
 * - AFENDA auth/* modules provide governance (audit, compliance, incident)
 * - `toAfendaSession()` bridges Neon Auth identity → AFENDA context
 */

import { createNeonAuth } from "@neondatabase/auth/next/server";
import type { Session } from "@neondatabase/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Neon Auth Instance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Neon Auth server configuration.
 * Credentials read from env at startup.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

/**
 * Export Neon Auth route handler for [...auth]/route.ts
 */
export const { GET, POST } = auth.handler();

// ─────────────────────────────────────────────────────────────────────────────
// Bridge to AFENDA Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Neon Auth session shape (from Better Auth).
 * Can be queried with `SELECT * FROM neon_auth.user` + `neon_auth.session`.
 */
export type NeonAuthSession = Session | null;

/**
 * AFENDA session shape.
 * Extends Neon Auth identity with AFENDA org/role context.
 */
export interface AfendaSession {
  // From Neon Auth
  user: {
    id: string;           // UUID from neon_auth.user.id
    email: string;        // From neon_auth.user.email
    name: string | null;
    image: string | null;
  };
  
  // From AFENDA context
  affiliation: {
    orgId: string;        // Resolved from user → party_membership → org
    principalId: string;  // From auth_principal or party table
    roles: string[];      // List of role IDs granted to this principal
    permissions: Set<string>; // Expanded from roles
  };
  
  // Metadata
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Convert Neon Auth session to AFENDA session.
 *
 * Prerequisites:
 * - Neon Auth user.id must be linked to AFENDA party/principal (via trigger or app logic)
 * - User's org membership must exist in party_membership table
 * - RLS policies must be active on all auth-* tables
 *
 * Stub: Future version will query AFENDA auth domain modules to populate:
 * - orgId from party_membership
 * - principalId from auth_principal or similar
 * - roles/permissions from role_assignment + permission registry
 */
export async function toAfendaSession(
  neonSession: NeonAuthSession,
): Promise<AfendaSession | null> {
  if (!neonSession?.user) return null;

  // TODO: Replace with real lookups once DB linking is in place.
  // For now, every Neon user gets demo org + admin principal.
  
  return {
    user: {
      id: neonSession.user.id,
      email: neonSession.user.email,
      name: neonSession.user.name ?? null,
      image: neonSession.user.image ?? null,
    },
    affiliation: {
      orgId: process.env.NODE_ENV === "development" 
        ? "00000000-0000-0000-0000-000000000001" // demo org UUID
        : "", // Will fail in prod until DB linking implemented
      principalId: neonSession.user.id,
      roles: ["admin"],
      permissions: new Set(["*"]), // TODO: query actual permissions
    },
    expiresAt: new Date(neonSession.expiresAt),
    createdAt: new Date(neonSession.createdAt ?? Date.now()),
  };
}

/**
 * Get current user session from cookies/headers.
 * Wrapper around Neon Auth + AFENDA bridge.
 *
 * Usage in Server Components / Route Handlers:
 *   const session = await getSession();
 *   if (!session) return <SignInPrompt />;
 */
export async function getSession(): Promise<AfendaSession | null> {
  const neonSession = await auth.api.getSession();
  return toAfendaSession(neonSession);
}

/**
 * Verify that a request has a valid session.
 * Middleware / API route pattern.
 */
export async function requireSession(): Promise<AfendaSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: no session");
  }
  return session;
}
```

### 2B. Create Route Handler

**File:** `apps/web/src/app/api/auth/[...auth]/route.ts` (REPLACE existing)

```typescript
/**
 * Neon Auth routes.
 * Replaces the old NextAuth [...nextauth]/route.ts.
 */

import { auth } from "@/lib/auth/server";

export const { GET, POST } = auth.handler();
```

Old file `apps/web/src/app/api/auth/[...nextauth]/route.ts` should be deleted.

### 2C. Enable Session Validation in Middleware

**File:** `apps/web/middleware.ts` (UPDATE)

```typescript
// ... existing imports ...
import { auth } from "@/lib/auth/server";

export async function middleware(request: NextRequest) {
  // Verify Neon Auth session is valid
  // (Optional: you can add extra auth checks here)
  const session = await auth.api.getSession();
  
  // Let request proceed; protected routes check session in their handlers
  return NextResponse.next();
}

export const config = {
  // Apply to all routes except static
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
```

---

## Phase 3: Client-Side SDK Setup

### 3A. Create Auth Client Module

**File:** `apps/web/src/lib/auth/client.ts` (NEW)

```typescript
/**
 * Neon Auth Client SDK for React components.
 *
 * Usage in Client Components:
 *   const { user, isLoading } = useAuth();
 *   if (!isLoading && !user) return <SignInButton />;
 *   return <Dashboard user={user} />;
 */

import { createAuthClient } from "@neondatabase/neon-js/auth";
import type { BetterAuthClientPlugin } from "better-auth/client";

/**
 * Neon Auth client instance.
 * Endpoint is NEXT_PUBLIC_NEON_AUTH_URL from env.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_NEON_AUTH_URL ?? "/api/auth",
  // Optional: custom plugins for AFENDA domain (audit, compliance, etc.)
  plugins: [
    // Future: add AFENDA-specific auth plugins (3-factor, anomaly detection, etc.)
  ],
});

/**
 * React hook: Get current user session.
 * Triggers re-render on auth state change (login, logout, session refresh).
 *
 * Example:
 *   const { user, isLoading, error } = useAuth();
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorAlert error={error} />;
 *   if (!user) return <SignInForm />;
 *   return <Dashboard user={user} />;
 */
export const useAuth = () => {
  const { data: session, isLoading, error } = authClient.useSession();
  return {
    user: session?.user ?? null,
    session,
    isLoading,
    error,
  };
};

/**
 * Sign in with email/password.
 */
export const signIn = authClient.signIn.email;

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 * Neon Auth provides out-of-the-box Google + custom OAuth.
 */
export const signInOAuth = authClient.signIn.social;

/**
 * Sign out and clear session cookie.
 */
export const signOut = authClient.signOut;

/**
 * Sign up new user with email/password.
 */
export const signUp = authClient.signUp.email;

/**
 * Request password reset flow.
 */
export const resetPassword = authClient.forgetPassword;

/**
 * Change user profile (name, image, etc.)
 * Does NOT change email or password (use separate endpoints).
 */
export const updateProfile = authClient.updateUser;
```

### 3B. Create Auth Provider

**File:** `apps/web/src/components/auth-provider.tsx` (NEW)

```typescript
"use client";

import React, { ReactNode } from "react";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { authClient } from "@/lib/auth/client";

/**
 * Wrap your app with this to enable Neon Auth UI components.
 * Use in root layout:
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html>
 *         <body>
 *           <AuthProvider>{children}</AuthProvider>
 *         </body>
 *       </html>
 *     );
 *   }
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <NeonAuthUIProvider authClient={authClient}>
      {children}
    </NeonAuthUIProvider>
  );
}
```

### 3C. Update Root Layout

**File:** `apps/web/src/app/layout.tsx` (UPDATE)

```typescript
import { AuthProvider } from "@/components/auth-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 3D. Create Sign-In Page

**File:** `apps/web/src/app/(public)/signin/page.tsx` (NEW/REPLACE)

Choose one approach:

#### Option A: Use Neon Auth UI Components (Simplest)

```typescript
"use client";

import { AuthView } from "@neondatabase/neon-js/auth/react/ui";
import { authClient } from "@/lib/auth/client";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md">
        <AuthView 
          authClient={authClient}
          pathname="sign-in" 
          mode="dark"
        />
      </div>
    </div>
  );
}
```

#### Option B: Custom UI with shadcn Form (Flexibility)

```typescript
"use client";

import { useState } from "react";
import { Button } from "@afenda/ui";
import { Input } from "@afenda/ui";
import { signIn } from "@/lib/auth/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await signIn({
        email,
        password,
        callbackURL: "/dashboard",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sign In to AFENDA</h1>
        
        {error && <div className="text-red-600">{error}</div>}
        
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <Button type="submit">Sign In</Button>
      </form>
    </div>
  );
}
```

---

## Phase 4: API Bearer Token Verification

### 4A. Update Auth Plugin

**File:** `apps/api/src/plugins/auth.ts` (REPLACE bearer stub)

```typescript
/**
 * Fastify plugin: Authentication for Neon Auth bearer tokens.
 *
 * Expects: Authorization: Bearer <JWK-signed-JWT-from-Neon-Auth>
 *
 * Neon Auth provides a JWKS endpoint; this plugin:
 * 1. Fetches JWKS (cached)
 * 2. Verifies JWT signature
 * 3. Resolves userId → AFENDA principal context
 * 4. Sets req.ctx with org/role/permission context
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import jwtVerify from "@panva/hkdf"; // Or use @noble/ciphers for JWT verification
import { resolvePrincipalContext } from "@afenda/core";

const DEV_HEADER = "x-dev-user-email";

/**
 * Placeholder: Fetch Neon Auth JWKS from provisioned auth endpoint.
 * In production, implement:
 * 1. GET {NEON_AUTH_BASE_URL}/.well-known/jwks.json
 * 2. Cache with 1-hour TTL
 * 3. Use `jose` lib to verify JWT
 */
async function verifyNeonAuthToken(token: string): Promise<{ sub: string; email: string } | null> {
  // TODO: Implement JWKS fetch + JWT verification
  // Stub returns null (bearer path disabled)
  return null;
}

export const authPlugin = fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("ctx", undefined);

  app.addHook("onRequest", async (req) => {
    // Skip infra endpoints
    if (req.url === "/healthz" || req.url === "/readyz") return;

    const isDev = process.env.NODE_ENV === "development";
    const slug = req.orgSlug ?? "demo";

    // ── Dev-mode shortcut ────────────────────────────────────────────────
    if (isDev && req.headers[DEV_HEADER]) {
      const email = req.headers[DEV_HEADER] as string;
      const ctx = await resolvePrincipalContext(app.db, email, slug, req.correlationId);
      if (ctx) {
        req.ctx = ctx;
        if (ctx.activeContext?.orgId) {
          req.orgId = ctx.activeContext.orgId;
        }
      }
      return;
    }

    // ── Neon Auth bearer token ───────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = await verifyNeonAuthToken(token);
      
      if (payload?.email) {
        const ctx = await resolvePrincipalContext(
          app.db,
          payload.email,
          slug,
          req.correlationId,
        );
        
        if (ctx) {
          req.ctx = ctx;
          if (ctx.activeContext?.orgId) {
            req.orgId = ctx.activeContext.orgId;
          }
        }
      }
    }

    // If no session resolved, routes requiring auth will return 401
  });
});
```

### 4B. Install JWT Dependencies

```bash
# For JWT verification (use jose or @noble/ciphers, NOT @panva/hkdf)
pnpm add -W jose

# Or use @noble/ciphers if you prefer smaller bundle
pnpm add -W @noble/ciphers
```

### 4C. Implement verifyNeonAuthToken

**Full implementation sketch:**

```typescript
import * as jose from "jose";

let cachedJwks: jose.JSONWebKeySet | null = null;
let jwksCacheTTL = 0;

async function fetchJwks(): Promise<jose.JSONWebKeySet> {
  const now = Date.now();
  if (cachedJwks && now < jwksCacheTTL) {
    return cachedJwks;
  }

  const baseURL = process.env.NEON_AUTH_BASE_URL;
  if (!baseURL) throw new Error("NEON_AUTH_BASE_URL not set");

  const res = await fetch(`${baseURL}/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);

  cachedJwks = await res.json();
  jwksCacheTTL = now + 3600_000; // 1 hour

  return cachedJwks;
}

async function verifyNeonAuthToken(
  token: string,
): Promise<{ sub: string; email: string } | null> {
  const jwks = await fetchJwks();
  const secret = jose.importJWKSet(jwks);

  try {
    const verified = await jose.jwtVerify(token, secret);
    const payload = verified.payload as { sub?: string; email?: string };
    
    if (payload.sub && payload.email) {
      return { sub: payload.sub, email: payload.email };
    }
  } catch (err) {
    // Invalid or expired token
    return null;
  }

  return null;
}
```

---

## Phase 5: Database Schema Alignment

### 5A. Link Neon Auth to AFENDA Domain

Neon Auth creates tables in `neon_auth` schema:
- `neon_auth.user` (id, email, name, image, createdAt)
- `neon_auth.session` (id, userId, expiresAt, etc.)
- `neon_auth.account` (OAuth provider accounts)
- `neon_auth.verification` (email/2FA verification codes)

AFENDA security modules use:
- `party` (org-scoped Party record)
- `auth_principal` (user identity)
- `party_membership` (org membership)
- `role_assignment` (role grants)
- `auth_*` tables (audit, compliance, incident, etc.)

**Linking strategy:**

Create a trigger that, upon Neon Auth signup:
1. Creates a AFENDA `party` record (party_type = 'user')
2. Creates `auth_principal` linked to neon_auth.user.id
3. Creates `party_membership` linking principal → org
4. Assigns default role

**File:** `packages/db/drizzle/migrations/0001_neon_auth_sync.sql` (NEW)

```sql
-- Trigger: When new neon_auth.user created, provision AFENDA principal
CREATE OR REPLACE FUNCTION sync_neon_auth_to_afenda()
RETURNS TRIGGER AS $$
DECLARE
  v_party_id UUID;
  v_principal_id UUID;
  v_org_id UUID;
BEGIN
  -- Get demo org (or configurable org from env context)
  SELECT id INTO v_org_id FROM public.party
  WHERE party_type = 'organization' AND name = 'Demo' LIMIT 1;
  
  IF v_org_id IS NULL THEN
    -- Fallback: use hardcoded demo org UUID
    v_org_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;

  -- Create AFENDA user party
  v_party_id := gen_random_uuid();
  INSERT INTO public.party (id, party_type, name, data, created_at, updated_at)
  VALUES (
    v_party_id,
    'user',
    COALESCE(NEW.name, NEW.email),
    jsonb_build_object('email', NEW.email, 'neon_auth_id', NEW.id),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Create AFENDA principal linked to Neon Auth user
  v_principal_id := gen_random_uuid();
  INSERT INTO public.auth_principal (id, party_id, principal_type, data, created_at)
  VALUES (
    NEW.id, -- Use Neon Auth user ID as principal ID for consistency
    v_party_id,
    'user',
    jsonb_build_object('email', NEW.email, 'neon_auth_synced', true),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Add to demo org
  INSERT INTO public.party_membership (party_id, org_id, status, created_at)
  VALUES (v_party_id, v_org_id, 'active', NOW())
  ON CONFLICT (party_id, org_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_neon_auth_sync
AFTER INSERT ON neon_auth.user
FOR EACH ROW
EXECUTE FUNCTION sync_neon_auth_to_afenda();
```

### 5B. Update resolvePrincipalContext

The existing function in `packages/core/src/kernel/infrastructure/` needs to:
1. Accept email as input
2. Look up neon_auth.user → auth_principal → party → party_membership
3. Return AFENDA context (orgId, principalId, roles, permissions)

**Stub to wire into server SDK's `toAfendaSession()`:**

```typescript
// packages/core/src/kernel/identity/resolve-principal.ts

export async function resolvePrincipalFromNeonAuth(
  db: Db,
  email: string,
  orgSlug: string,
  correlationId: string,
): Promise<RequestContext | null> {
  // 1. Query neon_auth.user by email
  const neonUser = await db.selectFrom('neon_auth.user')
    .selectAll()
    .where(sql`LOWER(email) = LOWER(${email})`)
    .executeTakeFirst();

  if (!neonUser) return null;

  // 2. Get AFENDA principal/org context
  const ctx = await resolvePrincipalContext(db, email, orgSlug, correlationId);
  return ctx;
}
```

### 5C: Row Level Security (RLS) Alignment

After Neon Auth provisioning, create RLS policies linking `neon_auth.user.id` to accessible organizations:

```sql
-- Example: Invoice table RLS policy that respects Neon Auth session
ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_neon_auth_isolation ON public.invoice
  AS (current_setting('app.org_id')::UUID = org_id);
```

This allows:
- `SET app.org_id = <user's org>` in API context hook
- All subsequent queries respect the org boundary
- Works for both Neon Auth (via API) and direct Postgres connections

---

## Phase 6: Remove Dev Shim

Once Neon Auth is live and bearer token verification works:

### 6A. Delete Temporary Auth Handler

**File:** `apps/web/auth.ts` (DELETE when safe)

This temporary shim was created during NextAuth removal:
```typescript
export function auth(): Promise<AuthSession | null>;
export function auth(handler: RouteHandler): WrappedRouteHandler;
export function auth(handler?: RouteHandler) {
  // Temporary synthetic admin session for dev
  // will be replaced by Neon Auth
}
```

**Replacement:** Use `getSession()` from `apps/web/src/lib/auth/server.ts` instead.

### 6B. Update Imports

Replace all:
```typescript
import { auth } from "@/auth";  // ❌ OLD (dev shim)
```

With:
```typescript
import { getSession } from "@/lib/auth/server";  // ✅ NEW (Neon Auth)
```

### 6C. Remove Dev-Header Bypass Loop

Once Neon Auth is stable, the dev-header bypass in `apps/api/src/plugins/auth.ts` can be removed or gate-checked.

---

## Integration: 67 Auth Domain Modules

AFENDA's security domain (`apps/web/src/features/auth/server/*`) provides:
- Audit logging (every state change)
- Incident handling (suspicious auth patterns)
- Compliance review (certifications, evidence, controls)
- Challenge/MFA/2FA (multi-factor auth)
- Risk scoring (anomaly detection)
- Session revocation (forced logout)

**These are INDEPENDENT of identity provider (Neon Auth).** They work via:

1. **Trigger-based:** Whenever a Neon Auth session is created/deleted, fire audit log + risk scoring
2. **Service layer:** After `toAfendaSession()`, propagate context to audit/compliance/governance modules
3. **RLS:** Neon Auth + AFENDA both respect org boundaries via `app.org_id` GUC

**No changes needed to existing 67 modules.** They continue as-is, just with Neon Auth as the identity provider.

---

## Environment Variables Checklist

### Production

```bash
# Neon Auth endpoint (from console)
NEON_AUTH_BASE_URL=https://your-endpoint.neonauth.region.aws.neon.tech/db/auth

# Cookie secret for session protection (generate with `openssl rand -base64 32`)
NEON_AUTH_COOKIE_SECRET=your-base64-encoded-32-byte-secret

# Web app client-side auth URL (same as above)
NEXT_PUBLIC_NEON_AUTH_URL=https://your-endpoint.neonauth.region.aws.neon.tech/db/auth
```

### Development

```bash
# Dev can use localhost or neon endpoint
NEON_AUTH_BASE_URL=http://localhost:5000/db/auth        # (local dev)
NEON_AUTH_BASE_URL=https://staging-endpoint.neonauth... # (shared dev)

NEON_AUTH_COOKIE_SECRET=dev-secret-not-used-in-tests

NEXT_PUBLIC_NEON_AUTH_URL=http://localhost:3000/api/auth # (dev)
```

### CI/CD

```bash
# GitHub Actions or similar should inject from secrets
NEON_AUTH_BASE_URL=${{ secrets.NEON_AUTH_BASE_URL }}
NEON_AUTH_COOKIE_SECRET=${{ secrets.NEON_AUTH_COOKIE_SECRET }}
NEXT_PUBLIC_NEON_AUTH_URL=${{ env.NEXT_PUBLIC_NEON_AUTH_URL }}
```

---

## Testing Checklist

### Unit Tests

- [ ] `apps/web/src/lib/auth/server.test.ts` – `toAfendaSession()`, `getSession()`
- [ ] `apps/web/src/lib/auth/client.test.ts` – `useAuth()` hook
- [ ] `apps/api/src/plugins/auth.test.ts` – `verifyNeonAuthToken()`, principal resolution

### Integration Tests

- [ ] Signup → neon_auth.user created → AFENDA party/principal/membership created
- [ ] Sign in → Bearer token in API request → req.ctx populated
- [ ] Sign out → Session cleared → API returns 401
- [ ] Multi-org: User in Org A cannot access Org B data (RLS + `app.org_id`)

### E2E Tests (Playwright)

- [ ] Sign up flow: email/password signup → redirect to dashboard
- [ ] Sign in flow: email/password login → session cookie set
- [ ] OAuth: Google/GitHub sign in → neon_auth.user created
- [ ] Protected route: /dashboard without session → redirect to /signin
- [ ] Session expiry: token expires → automatic logout + redirect

### Branching Test

- [ ] Create Neon preview branch → auth state branches with data
- [ ] Sign up in preview → user exists only in preview branch
- [ ] Merge preview to main → auth state merged (if applicable)

---

## Rollback Plan

If Neon Auth integration fails:

1. **Keep dev shim alive** until Neon Auth verified in staging
2. **Feature flag** the bearer token path: `if (env.USE_NEON_AUTH) { ... }`
3. **Gradual rollout:** Dev → staging → canary → production
4. **Keep NextAuth removal separate** from Neon Auth wiring (already done)

Rollback pseudocode:
```typescript
// in auth plugin
if (process.env.USE_NEON_AUTH === "true") {
  // Neon Auth path
} else {
  // Fallback to dev shim
}
```

---

## Neon Auth Limitations (As of March 2026)

- ⚠️ **AWS regions only** (no Azure yet)
- ⚠️ **No IP Allow or Private Networking** in same project
- ⚠️ **Better Auth 1.4.18 only** (not latest)
- ⚠️ **Roadmap items not yet supported:**
  - Custom OAuth flows
  - SAML/OIDC enterprise integrations
  - Advanced 2FA plugins
  - Session analytics dashboards

For unsupported features, self-host Better Auth instead.

---

## Related Skills

- `neon-postgres` – Neon fundamentals, branching, connection pooling
- `better-auth-best-practices` – Better Auth API design, security
- `nextauth-authentication` – Migration path from NextAuth v5
- `fastify-best-practices` – Bearer token patterns in Fastify

---

## References

- [Neon Auth Overview](https://neon.tech/unify?a=9d1fe3b2-9aff-4154-a4c9-afdf4da44dc6&n=docs/auth/overview)
- [Neon Auth Next.js Quick Start](https://neon.tech/unify?a=9d1fe3b2-9aff-4154-a4c9-afdf4da44dc6&n=docs/auth/quick-start/nextjs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [AFENDA Architecture (PROJECT.md)](../PROJECT.md)
- [AFENDA Auth Domain Module Structure](../../apps/web/src/features/auth/server/STRUCTURE.md)

---

Last updated: March 12, 2026
