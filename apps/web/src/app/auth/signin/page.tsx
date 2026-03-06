"use client";

/**
 * Sign-in page.
 *
 * NextAuth is configured with `pages: { signIn: "/auth/signin" }` so any
 * unauthenticated navigation lands here.  The credentials provider expects
 * an `email` and `password` field matching `authOptions` in lib/auth.ts.
 *
 * Note: useSearchParams requires Suspense boundary for static generation.
 * We wrap SignInForm in Suspense to handle this properly.
 */

import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Loading fallback for the sign-in form.
 */
function SignInFormSkeleton() {
  return (
    <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6 h-8 w-24 skeleton rounded" />
      <div className="space-y-4">
        <div className="h-16 w-full skeleton rounded" />
        <div className="h-16 w-full skeleton rounded" />
        <div className="h-10 w-full skeleton rounded" />
      </div>
    </div>
  );
}

/**
 * Sign-in form with search params handling.
 */
function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
    });
  }

  return (
    <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Sign in</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-100">
      <Suspense fallback={<SignInFormSkeleton />}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
