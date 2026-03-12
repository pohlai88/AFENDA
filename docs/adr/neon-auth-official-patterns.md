# Official Neon Auth Next.js Patterns Reference

**Document**: Extracted from official Neon Auth quickstart guides (Feb 16, 2026)  
**Purpose**: Canonical reference for Neon Auth implementation in Next.js App Router  
**Scope**: Official patterns for both UI Components and API Methods approaches

---

## Quick Reference: Two Official Paths

### Path A: Pre-built UI Components (Easier)
- **Package**: `@neondatabase/auth/react`
- **Components**: `NeonAuthUIProvider`, `AuthView`, `AccountView`, `UserButton`
- **Setup**: Wrap layout with provider + import styles
- **Pages**: Dynamic routes handle `/auth/[path]`, `/account/[path]`
- **Time**: Fastest to production

### Path B: Manual API Methods (More Control)
- **Package**: `@neondatabase/auth/next` (client)
- **Methods**: `authClient.signUp.email()`, `authClient.signIn.email()`, etc.
- **Setup**: Manual form components + server actions
- **Pages**: Custom pages (sign-up, sign-in) with your own UI
- **Time**: More development but full control

---

## Official Step-by-Step Pattern

### Step 1: Install SDK
```bash
npm install @neondatabase/auth@latest
```

### Step 2: Environment Variables (.env.local or .env)
```
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=your-secret-at-least-32-characters-long
```

**Note**: `NEON_AUTH_COOKIE_SECRET` generated via: `openssl rand -base64 32`

### Step 3: Create Auth Server Instance (lib/auth/server.ts)
```typescript
import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!
  }
});
```

**Official Note**: Single instance provides:
- `.handler()` for API routes
- `.middleware()` for route protection
- `.getSession()` and all Better Auth server methods

### Step 4: Set Up Auth API Route (app/api/auth/[...path]/route.ts)
```typescript
import { auth } from '@/lib/auth/server';

export const { GET, POST } = auth.handler();
```

**Official Note**: All Neon Auth APIs routed through this handler (proxied transparently)

### Step 5: Add Authentication Middleware (proxy.ts in project root)
```typescript
import { auth } from '@/lib/auth/server';

export default auth.middleware({
  // Redirects unauthenticated users to sign-in page
  loginUrl: '/auth/sign-in'
});

export const config = {
  matcher: [
    // Protected routes requiring authentication
    '/account/:path*'
  ]
};
```

**Alternative**: Can use Next.js `middleware.ts` instead of `proxy.ts`

### Step 6: Configure Auth Client (lib/auth/client.ts)
```typescript
'use client';

import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();
```

**Official Note**: Server-side `auth` and client-side `authClient` are separate instances

---

## Path A: UI Components Setup

### Step 7A: Wrap Layout with NeonAuthUIProvider (app/layout.tsx)
```typescript
import { authClient } from '@/lib/auth/client';
import { NeonAuthUIProvider, UserButton } from '@neondatabase/auth/react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'My Neon App',
  description: 'A Next.js application with Neon Auth'
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NeonAuthUIProvider
          authClient={authClient}
          redirectTo="/account/settings"
          emailOTP
        >
          <header className="flex justify-end items-center p-4 gap-4 h-16">
            <UserButton size="icon" />
          </header>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
```

**Critical**: Add `suppressHydrationWarning` to `<html>` tag to prevent next-themes hydration errors

### Step 7B: Add Neon Auth UI Styles (app/globals.css)
```css
@import "tailwindcss";
@import "@neondatabase/auth/ui/tailwind";
```

**Note**: Goes at TOP of globals.css file

### Step 8A: Create Auth Pages (app/auth/[path]/page.tsx)
```typescript
import { AuthView } from '@neondatabase/auth/react';

export const dynamicParams = false;

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthView path={path} />
    </main>
  );
}
```

**Official Routes Covered**:
- `/auth/sign-in` - Sign in with email/password and social providers
- `/auth/sign-up` - New account registration
- `/auth/sign-out` - Sign out

### Step 8B: Create Account Pages (app/account/[path]/page.tsx)
```typescript
import { AccountView } from '@neondatabase/auth/react';

export const dynamicParams = false;

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AccountView path={path} />
    </main>
  );
}
```

**Official Routes Covered**:
- `/account/settings` - User manages profile details
- `/account/security` - Change password, list active sessions

### Step 9A: Access User Data - Server Component
```typescript
import { auth } from '@/lib/auth/server';

// Server components using auth methods must be rendered dynamically
export const dynamic = 'force-dynamic';

export default async function ServerRenderedPage() {
  const { data: session } = await auth.getSession();

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Server Rendered Page</h1>
      <p className="text-gray-400">
        Authenticated:{' '}
        <span className={session ? 'text-green-500' : 'text-red-500'}>
          {session ? 'Yes' : 'No'}
        </span>
      </p>
      {session?.user && <p className="text-gray-400">User ID: {session.user.id}</p>}
      <p className="font-medium text-gray-700 dark:text-gray-200">Session and User Data:</p>
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
        {JSON.stringify({ session: session?.session, user: session?.user }, null, 2)}
      </pre>
    </div>
  );
}
```

---

## Path B: Manual API Methods Setup

### Step 8B: Create Sign-Up Form & Action
**File: app/auth/sign-up/actions.ts**
```typescript
'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email address must be provided.' };
  }

  // Optionally restrict sign ups based on email address
  // if (!email.trim().endsWith("@my-company.com")) {
  //   return { error: 'Email must be from my-company.com' };
  // }

  const { error } = await auth.signUp.email({
    email,
    name: formData.get('name') as string,
    password: formData.get('password') as string
  });

  if (error) {
    return { error: error.message || 'Failed to create account' };
  }

  redirect('/');
}
```

**File: app/auth/sign-up/page.tsx**
```typescript
'use client';

import { useActionState } from 'react';
import { signUpWithEmail } from './actions';

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUpWithEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        className="px-4 py-2 mb-4 border rounded"
      />
      <input
        type="text"
        name="name"
        placeholder="Full Name"
        className="px-4 py-2 mb-4 border rounded"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        required
        className="px-4 py-2 mb-4 border rounded"
      />
      <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">
        Sign Up
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

### Step 9B: Create Sign-In Form & Action
**File: app/auth/sign-in/actions.ts**
```typescript
'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const { error } = await auth.signIn.email({
    email: formData.get('email') as string,
    password: formData.get('password') as string
  });

  if (error) {
    return { error: error.message || 'Failed to sign in. Try again' };
  }

  redirect('/');
}
```

**File: app/auth/sign-in/page.tsx**
```typescript
'use client';

import { useActionState } from 'react';
import { signInWithEmail } from './actions';

export default function SignInPage() {
  const [state, formAction] = useActionState(signInWithEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        className="px-4 py-2 mb-4 border rounded"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        required
        className="px-4 py-2 mb-4 border rounded"
      />
      <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">
        Sign In
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

### Step 10: Create Home Page
```typescript
import { auth } from '@/lib/auth/server';
import Link from 'next/link';

// Server components using auth methods must be rendered dynamically
export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();

  if (session?.user) {
    return (
      <div className="flex flex-col gap-2 min-h-screen items-center justify-center bg-gray-900">
        <h1 className="mb-4 text-4xl">
          Logged in as <span className="font-bold underline">{session.user.name}</span>
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-h-screen items-center justify-center bg-gray-900">
      <h1 className="mb-4 text-4xl font-bold">Not logged in</h1>
      <div className="flex item-center gap-2">
        <Link href="/auth/sign-up" className="inline-flex text-lg text-indigo-400 hover:underline">
          Sign-up
        </Link>
        <Link href="/auth/sign-in" className="inline-flex text-lg text-indigo-400 hover:underline">
          Sign-in
        </Link>
      </div>
    </div>
  );
}
```

---

## Official Available SDK Methods

Both `authClient` (client) and `auth` (server) expose these methods:

**Authentication**:
- `authClient.signUp.email()` / `auth.signUp.email()` - Create new user account
- `authClient.signIn.email()` / `auth.signIn.email()` - Sign in with email and password
- `authClient.signOut()` / `auth.signOut()` - Sign out current user

**Session & User**:
- `authClient.getSession()` / `auth.getSession()` - Get current session
- `authClient.updateUser()` / `auth.updateUser()` - Update user details

**Server-only Methods**:
- `auth.handler()` - Returns `{ GET, POST }` for route handler
- `auth.middleware()` - Returns middleware function for protection

---

## Key Official Notes

### Safari HTTPS Requirement
Safari blocks third-party cookies on non-HTTPS connections. In dev:
```bash
npm run dev -- --experimental-https
# Then open https://localhost:3000
```

### Dynamic Route Parameter Handling
Official pattern uses `async` params with Promise await:
```typescript
export default async function Page({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  // ...
}
```

### Force Dynamic for Auth Components
All pages accessing `auth.getSession()` must be `force-dynamic`:
```typescript
export const dynamic = 'force-dynamic';
```

### Environment Variable Location
- `.env` (committed, documented)
- `.env.local` (local dev, gitignored)
- `.env.production` (production values)

Official docs show `.env.local` for quickstart but `.env` for documented placeholders.

---

## Official Next Steps from Quickstart

1. [Add email verification](https://neon.com/docs/auth/guides/email-verification)
2. [Learn how to branch your auth](https://neon.com/docs/auth/branching-authentication)

---

## Official Constraints (As of Feb 16, 2026)

- **Status**: BETA (feedback encouraged)
- **Foundation**: Better Auth 1.4.18
- **SDK Version**: `@neondatabase/auth@latest`
- **Framework**: Next.js 14+ (App Router)
- **Infrastructure**: AWS-only (no Azure yet)
- **Limitations**: No IP Allow, no Private Networking

---

## AFENDA-Specific Adaptations Required

The official patterns above work perfectly for identity-only apps. For AFENDA's multi-tenant model, add:

1. **Multi-tenancy Bridge** (custom to AFENDA):
   - Hook into `auth.getSession()` response
   - Resolve org context from user identity
   - Inject `app.org_id` into database GUCs

2. **API Bearer Token Verification** (custom to AFENDA):
   - JWKS endpoint fetch from `NEON_AUTH_BASE_URL/.well-known/jwks.json`
   - JWT validation in Fastify plugin
   - Principal context resolution from email

3. **Database Sync** (custom to AFENDA):
   - SQL trigger on `neon_auth.user` INSERT
   - Auto-create party/principal/membership
   - RLS policies per org

These are documented in `.agents/skills/neon-auth-integration/SKILL.md` Phases 5-6.

