"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Input, Label } from "@afenda/ui";

import { signUpAction } from "../_actions/signup";
import { AuthCard } from "../_components/auth-card";
import { AuthFooter } from "../_components/auth-footer";
import { AuthFormMessage } from "../_components/auth-form-message";
import { AuthHeader } from "../_components/auth-header";
import { AuthHiddenField } from "../_components/auth-hidden-field";
import { AuthOAuthButtons } from "../_components/auth-oauth-buttons";
import { AuthPageShell } from "../_components/auth-page-shell";
import { AuthSubmitButton } from "../_components/auth-submit-button";
import { PasswordHint } from "../_components/password-hint";
import { PasswordStrengthBar } from "../_components/password-strength-bar";
import { getSignUpDescription, getSignUpTitle } from "../_lib/auth-copy";
import { INITIAL_AUTH_ACTION_STATE } from "../_lib/auth-state";

interface SignUpPageClientProps {
  callbackUrl?: string;
}

export function SignUpPageClient({ callbackUrl }: SignUpPageClientProps) {
  const [state, formAction] = useActionState(
    signUpAction,
    INITIAL_AUTH_ACTION_STATE,
  );
  const [password, setPassword] = useState("");

  return (
    <AuthPageShell portal="app" journey="signup">
      <AuthHeader
        backHref={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin"}
        backLabel="Back to sign in"
        actionHref="/"
        actionLabel="Home"
      />

      <AuthCard
        title={getSignUpTitle()}
        description={getSignUpDescription()}
      >
        <div className="space-y-6">
          <form action={formAction} className="space-y-4">
          <AuthHiddenField name="callbackUrl" value={callbackUrl ?? ""} />

          <AuthFormMessage
            state={state}
            primaryHref={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin"}
            primaryLabel="Already have an account? Sign in"
            secondaryHref="/"
            secondaryLabel="Back to home"
          />

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Jane Doe"
              autoComplete="name"
              aria-invalid={!!state.fieldErrors?.fullName?.length}
            />
            {state.fieldErrors?.fullName?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.fullName[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Acme Inc."
              autoComplete="organization"
              aria-invalid={!!state.fieldErrors?.companyName?.length}
            />
            {state.fieldErrors?.companyName?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.companyName[0]}
              </p>
            ) : null}
          </div>

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

          <div className="space-y-3">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!state.fieldErrors?.password?.length}
            />
            <PasswordStrengthBar password={password} />
            <PasswordHint password={password} />
            {state.fieldErrors?.password?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.password[0]}
              </p>
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

          <AuthSubmitButton>Create account</AuthSubmitButton>

          </form>

          <AuthOAuthButtons callbackUrl={callbackUrl} />
        </div>
      </AuthCard>

      <AuthFooter>
        Already have an account?{" "}
        <Link
          href={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin"}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </AuthFooter>
    </AuthPageShell>
  );
}
