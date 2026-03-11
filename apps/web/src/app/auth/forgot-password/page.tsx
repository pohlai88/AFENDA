"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input, Label } from "@afenda/ui";

import { forgotPasswordAction } from "../_actions/forgot-password";
import { AuthCard } from "../_components/auth-card";
import { AuthFooter } from "../_components/auth-footer";
import { AuthFormMessage } from "../_components/auth-form-message";
import { AuthHeader } from "../_components/auth-header";
import { AuthPageShell } from "../_components/auth-page-shell";
import { AuthSubmitButton } from "../_components/auth-submit-button";
import { INITIAL_AUTH_ACTION_STATE } from "../_lib/auth-state";

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  return (
    <AuthPageShell>
      <AuthHeader
        backHref="/auth/signin"
        backLabel="Back to sign in"
        actionHref="/auth/signup"
        actionLabel="Create account"
      />
      <AuthCard
        title="Forgot password"
        description="Enter your email and we'll send you reset instructions."
      >
        <form action={formAction} className="space-y-4">
          <AuthFormMessage
            state={state}
            primaryHref="/auth/signin"
            primaryLabel="Return to sign in"
            secondaryHref="/auth/signup"
            secondaryLabel="Create account"
          />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              aria-invalid={!!state.fieldErrors?.email?.length}
            />
            {state.fieldErrors?.email?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <AuthSubmitButton loadingText="Sending reset link...">
            Send reset link
          </AuthSubmitButton>
        </form>
      </AuthCard>

      <AuthFooter>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/auth/signin"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Return to sign in
          </Link>
          <span className="text-sm text-muted-foreground">or</span>
          <Link
            href="/auth/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        </div>
      </AuthFooter>
    </AuthPageShell>
  );
}
