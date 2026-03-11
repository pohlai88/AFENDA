"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@afenda/ui";

import { acceptInviteAction } from "../_actions/invite";
import { AuthCard } from "../_components/auth-card";
import { AuthFooter } from "../_components/auth-footer";
import { AuthFormMessage } from "../_components/auth-form-message";
import { AuthHeader } from "../_components/auth-header";
import { AuthHiddenField } from "../_components/auth-hidden-field";
import { AuthPageShell } from "../_components/auth-page-shell";
import { AuthSubmitButton } from "../_components/auth-submit-button";
import { PasswordHint } from "../_components/password-hint";
import { PasswordStrengthBar } from "../_components/password-strength-bar";
import { INITIAL_AUTH_ACTION_STATE } from "../_lib/auth-state";

interface InviteClientPageProps {
  hasToken: boolean;
  token?: string;
  callbackUrl?: string;
  inviteEmail?: string;
  portalLabel?: string;
  tenantName?: string;
  valid: boolean;
}

export function InviteClientPage({
  hasToken,
  token,
  callbackUrl,
  inviteEmail,
  portalLabel,
  tenantName,
  valid,
}: InviteClientPageProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    acceptInviteAction,
    INITIAL_AUTH_ACTION_STATE,
  );
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      const timer = setTimeout(() => {
        router.push(state.redirectTo);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.ok, state.redirectTo, router]);

  const statusTitle = valid
    ? "Accept invitation"
    : hasToken
      ? "Invitation unavailable"
      : "Invitation link required";

  const statusDescription = valid
    ? `Complete your account setup${tenantName ? ` to join ${tenantName}` : ""}.`
    : hasToken
      ? "This invitation is invalid or has expired."
      : "Open the full invitation link from your email to continue account setup.";

  const statusBody = hasToken
    ? "Please request a new invitation from your administrator."
    : "If you were invited, use the exact link from your email or ask your administrator to send a new one.";

  return (
    <AuthPageShell>
      <AuthHeader
        backHref="/auth/signin"
        backLabel="Back to sign in"
        actionHref="/"
        actionLabel="Home"
      />
      <AuthCard
        title={statusTitle}
        description={statusDescription}
      >
        {valid ? (
          <form action={formAction} className="space-y-4">
            <AuthHiddenField name="token" value={token ?? ""} />
            <AuthHiddenField name="callbackUrl" value={callbackUrl ?? ""} />

            <AuthFormMessage
              state={state}
              primaryHref="/auth/signin"
              primaryLabel="Return to sign in"
              secondaryHref="/"
              secondaryLabel="Back to home"
            />

            {inviteEmail ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {inviteEmail}</div>
                {portalLabel ? (
                  <div><span className="text-muted-foreground">Portal:</span> {portalLabel}</div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Your name"
                aria-invalid={!!state.fieldErrors?.name?.length}
              />
              {state.fieldErrors?.name?.[0] ? (
                <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password">Create password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!state.fieldErrors?.password?.length}
              />
              <PasswordStrengthBar password={password} />
              <PasswordHint password={password} />
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
                aria-invalid={!!state.fieldErrors?.confirmPassword?.length}
              />
              {state.fieldErrors?.confirmPassword?.[0] ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.confirmPassword[0]}
                </p>
              ) : null}
            </div>

            <AuthSubmitButton>Accept invitation</AuthSubmitButton>
          </form>
        ) : (
          <div className="text-sm text-muted-foreground">
            {statusBody}
          </div>
        )}
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
            href={hasToken ? "/auth/forgot-password" : "/"}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {hasToken ? "Forgot password?" : "Back to home"}
          </Link>
        </div>
      </AuthFooter>
    </AuthPageShell>
  );
}
