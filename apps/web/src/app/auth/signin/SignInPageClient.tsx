"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label, Separator } from "@afenda/ui";

import { signInAction } from "../_actions/signin";
import { AuthCard } from "../_components/auth-card";
import { AuthFooter } from "../_components/auth-footer";
import { AuthFormMessage } from "../_components/auth-form-message";
import { AuthHeader } from "../_components/auth-header";
import { AuthHiddenField } from "../_components/auth-hidden-field";
import { AuthOAuthButtons } from "../_components/auth-oauth-buttons";
import { AuthPageShell } from "../_components/auth-page-shell";
import { AuthSubmitButton } from "../_components/auth-submit-button";
import { PortalSwitcher } from "../_components/portal-switcher";
import {
  getOrganizationSignInDescription,
  getOrganizationSignInTitle,
} from "../_lib/auth-copy";
import type { AuthActionState } from "../_lib/auth-state";
import { INITIAL_AUTH_ACTION_STATE } from "../_lib/auth-state";

interface SignInPageClientProps {
  callbackUrl?: string;
  noticeState?: AuthActionState;
}

export function SignInPageClient({ callbackUrl, noticeState }: SignInPageClientProps) {
  const [state, formAction] = useActionState(
    signInAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  const messageState = state.message ? state : noticeState ?? null;

  return (
    <AuthPageShell portal="app" journey="signin">
      <AuthHeader
        backHref="/"
        backLabel="Back to home"
        actionHref={callbackUrl ? `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signup"}
        actionLabel="Create account"
      />

      <div className="mb-6 space-y-6">
        <PortalSwitcher value="app" />
        <Separator className="bg-border/70" />
      </div>

      <AuthCard
        title={getOrganizationSignInTitle()}
        description={getOrganizationSignInDescription()}
      >
        <div className="space-y-6">
          <form action={formAction} className="space-y-4">
          <AuthHiddenField name="callbackUrl" value={callbackUrl ?? ""} />

          <AuthFormMessage
            state={messageState}
            primaryHref="/auth/forgot-password"
            primaryLabel={state.ok ? "Continue to sign in" : "Forgot password?"}
            secondaryHref="/auth/signup"
            secondaryLabel={state.ok ? "Create another workspace" : "Create account"}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!state.fieldErrors?.password?.length}
            />
            {state.fieldErrors?.password?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.password[0]}
              </p>
            ) : null}
          </div>

          <AuthSubmitButton>Sign in</AuthSubmitButton>

          <Link
            href={callbackUrl ? `/auth/verify?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/verify"}
            className="w-full"
          >
            <Button
              type="button"
              variant="outline"
              className="w-full"
            >
              Have a verification code?
            </Button>
          </Link>

          </form>

          <AuthOAuthButtons callbackUrl={callbackUrl} />
        </div>
      </AuthCard>

      <AuthFooter>
        Don&apos;t have an account?{" "}
        <Link
          href={callbackUrl ? `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signup"}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </AuthFooter>
    </AuthPageShell>
  );
}
