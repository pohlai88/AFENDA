"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@afenda/ui";

import { resetPasswordAction } from "../_actions/reset-password";
import { AuthCard } from "../_components/auth-card";
import { AuthFooter } from "../_components/auth-footer";
import { AuthFormMessage } from "../_components/auth-form-message";
import { AuthHeader } from "../_components/auth-header";
import { AuthHiddenField } from "../_components/auth-hidden-field";
import { AuthPageShell } from "../_components/auth-page-shell";
import { AuthSubmitButton } from "../_components/auth-submit-button";
import { INITIAL_AUTH_ACTION_STATE } from "../_lib/auth-state";

interface ResetPasswordClientPageProps {
  token?: string;
  email?: string;
  valid: boolean;
}

export function ResetPasswordClientPage({
  token,
  email,
  valid,
}: ResetPasswordClientPageProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    resetPasswordAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      const redirectTo = state.redirectTo;
      const timer = setTimeout(() => {
        router.push(redirectTo);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.ok, state.redirectTo, router]);

  return (
    <AuthPageShell>
      <AuthHeader
        backHref="/auth/signin"
        backLabel="Back to sign in"
        actionHref="/auth/forgot-password"
        actionLabel="Request new link"
      />
      <AuthCard
        title={valid ? "Reset password" : "Reset link unavailable"}
        description={
          valid
            ? "Choose a new password for your account."
            : "This reset link is invalid or has expired."
        }
      >
        {valid ? (
          <form action={formAction} className="space-y-4">
            <AuthHiddenField name="token" value={token ?? ""} />

            <AuthFormMessage
              state={state}
              primaryHref="/auth/signin"
              primaryLabel="Back to sign in"
              secondaryHref="/auth/forgot-password"
              secondaryLabel="Request another link"
            />

            {email ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Account:</span> {email}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!state.fieldErrors?.password?.length}
              />
              {state.fieldErrors?.password?.[0] ? (
                <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!state.fieldErrors?.confirmPassword?.length}
              />
              {state.fieldErrors?.confirmPassword?.[0] ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.confirmPassword[0]}
                </p>
              ) : null}
            </div>

            <AuthSubmitButton>Update password</AuthSubmitButton>
          </form>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please request a new reset link.
          </div>
        )}
      </AuthCard>

      <AuthFooter>
        {valid ? (
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/auth/signin"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
            <span className="text-sm text-muted-foreground">or</span>
            <Link
              href="/auth/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/auth/forgot-password"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Get another reset link
            </Link>
            <span className="text-sm text-muted-foreground">or</span>
            <Link
              href="/auth/signin"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Return to sign in
            </Link>
          </div>
        )}
      </AuthFooter>
    </AuthPageShell>
  );
}
