import Link from "next/link";
import { Button } from "@afenda/ui";

import { signOutAction } from "../_actions/signout";
import { AuthCard } from "../_components/auth-card";
import { AuthFooter } from "../_components/auth-footer";
import { AuthHeader } from "../_components/auth-header";
import { AuthPageShell } from "../_components/auth-page-shell";
import { AuthSubmitButton } from "../_components/auth-submit-button";

export default function SignOutPage() {
  return (
    <AuthPageShell>
      <AuthHeader
        backHref="/app"
        backLabel="Back to app"
        actionHref="/auth/signin"
        actionLabel="Switch account"
      />

      <AuthCard
        title="Sign out"
        description="End your current session on this device."
      >
        <form action={signOutAction} className="space-y-4">
          <AuthSubmitButton>Sign out now</AuthSubmitButton>
        </form>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/app">Cancel</Link>
        </Button>
      </AuthCard>

      <AuthFooter>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/auth/signin"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Use another account
          </Link>
          <span className="text-sm text-muted-foreground">or</span>
          <Link
            href="/auth/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create new account
          </Link>
        </div>
      </AuthFooter>
    </AuthPageShell>
  );
}