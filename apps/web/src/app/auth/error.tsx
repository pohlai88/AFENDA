"use client";

import Link from "next/link";
import { Button } from "@afenda/ui";

import { AuthCard } from "./_components/auth-card";
import { AuthFooter } from "./_components/auth-footer";
import { AuthHeader } from "./_components/auth-header";
import { AuthPageShell } from "./_components/auth-page-shell";

export default function AuthError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthPageShell>
      <AuthHeader
        backHref="/auth/signin"
        backLabel="Back to sign in"
        actionHref="/"
        actionLabel="Home"
      />

      <AuthCard
        title="We couldn’t load this page"
        description="The session flow is still safe, but this screen needs another attempt."
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Try again, return to sign in, or go back home.
        </div>

        <div className="space-y-3">
          <Button type="button" onClick={reset} className="w-full">
            Try again
          </Button>
          <Button asChild type="button" variant="outline" className="w-full">
            <Link href="/auth/signin">Return to sign in</Link>
          </Button>
        </div>
      </AuthCard>

      <AuthFooter>
        <Link
          href="/"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </AuthFooter>
    </AuthPageShell>
  );
}