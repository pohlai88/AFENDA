"use client";

import Link from "next/link";
import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

import { verifyAction } from "../_actions/verify";
import { AuthCard } from "../_components/auth-card";
import { AuthFooter } from "../_components/auth-footer";
import { AuthFormMessage } from "../_components/auth-form-message";
import { AuthHeader } from "../_components/auth-header";
import { AuthPageShell } from "../_components/auth-page-shell";
import { OTPForm } from "../_components/otp-form";
import { INITIAL_AUTH_ACTION_STATE } from "../_lib/auth-state";

export function VerifyClientPage({
  callbackUrl,
  mfaToken,
}: {
  callbackUrl?: string;
  mfaToken?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    verifyAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      const timer = setTimeout(() => {
        router.push(state.redirectTo);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.ok, state.redirectTo, router]);

  const handleCodeSubmit = (code: string) => {
    const formData = new FormData();
    formData.append("code", code);
    formData.append("callbackUrl", callbackUrl ?? "");
    formData.append("mfaToken", mfaToken ?? "");
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <AuthPageShell>
      <AuthHeader
        backHref="/auth/signin"
        backLabel="Back to sign in"
        actionHref="/auth/forgot-password"
        actionLabel="Need help?"
      />
      <AuthCard
        title="Verify sign in"
        description="Enter the 6-digit code from your authenticator app."
      >
        <form className="space-y-6">
          <AuthFormMessage
            state={state}
            primaryHref="/auth/signin"
            primaryLabel="Back to sign in"
            secondaryHref="/auth/forgot-password"
            secondaryLabel="Need another route?"
          />

          <OTPForm
            onSubmit={handleCodeSubmit}
            isLoading={isPending || (state.ok === true && !!state.redirectTo)}
            error={state.ok === false ? state.message : null}
            helperText="Use the current 6-digit code from Google Authenticator or another TOTP app."
            resendCooldownSeconds={60}
          />
        </form>
      </AuthCard>

      <AuthFooter>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/auth/signin"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Start over
          </Link>
          <span className="text-sm text-muted-foreground">or</span>
          <Link
            href="/auth/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Need help signing in?
          </Link>
        </div>
      </AuthFooter>
    </AuthPageShell>
  );
}
