"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { PortalType } from "@afenda/contracts";
import { Input, Label, Separator } from "@afenda/ui";

import { portalSignInAction } from "../../../_actions/signin";
import { AuthCard } from "../../../_components/auth-card";
import { AuthFooter } from "../../../_components/auth-footer";
import { AuthFormMessage } from "../../../_components/auth-form-message";
import { AuthHeader } from "../../../_components/auth-header";
import { AuthHiddenField } from "../../../_components/auth-hidden-field";
import { AuthOAuthButtons } from "../../../_components/auth-oauth-buttons";
import { AuthPageShell } from "../../../_components/auth-page-shell";
import { AuthSubmitButton } from "../../../_components/auth-submit-button";
import { PortalSwitcher } from "../../../_components/portal-switcher";
import { getPortalSignInDescription, getPortalSignInTitle } from "../../../_lib/auth-copy";
import { INITIAL_AUTH_ACTION_STATE } from "../../../_lib/auth-state";

interface PortalSignInClientPageProps {
  portal: PortalType;
  callbackUrl?: string;
}

export function PortalSignInClientPage({
  portal,
  callbackUrl,
}: PortalSignInClientPageProps) {
  const [state, formAction] = useActionState(
    portalSignInAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  return (
    <AuthPageShell portal={portal} journey="signin">
      <AuthHeader
        backHref="/auth/signin"
        backLabel="Back to organization sign in"
        actionHref="/"
        actionLabel="Home"
      />

      <div className="mb-6 space-y-6">
        <PortalSwitcher value={portal} />
        <Separator className="bg-border/70" />
      </div>

      <AuthCard
        title={getPortalSignInTitle(portal)}
        description={getPortalSignInDescription(portal)}
      >
        <div className="space-y-6">
        <form action={formAction} className="space-y-4">
          <AuthHiddenField name="portal" value={portal} />
          <AuthHiddenField name="callbackUrl" value={callbackUrl ?? ""} />

          <AuthFormMessage
            state={state}
            primaryHref="/auth/signin"
            primaryLabel="Use organization sign in"
            secondaryHref="/"
            secondaryLabel="Back to home"
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
          </form>

          <AuthOAuthButtons callbackUrl={callbackUrl} />
        </div>
      </AuthCard>

      <AuthFooter>
        <Link
          href="/auth/signin"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Use organization sign in instead
        </Link>
      </AuthFooter>
    </AuthPageShell>
  );
}
