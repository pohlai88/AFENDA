"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button, Input, Label } from "@afenda/ui";

import { sendEmailOtpAction, signInWithEmailOtpAction } from "../_actions/email-otp";
import { AuthCard } from "../_components/auth-card";
import { AuthFormMessage } from "../_components/auth-form-message";
import { AuthPageShell } from "../_components/auth-page-shell";
import { AuthSubmitButton } from "../_components/auth-submit-button";
import type { AuthActionState } from "../_lib/auth-state";
import { INITIAL_AUTH_ACTION_STATE } from "../_lib/auth-state";

interface SignInWithCodeClientProps {
  callbackUrl?: string;
}

export function SignInWithCodeClient({ callbackUrl }: SignInWithCodeClientProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [emailForCode, setEmailForCode] = useState("");

  const [sendState, sendFormAction] = useActionState(
    sendEmailOtpAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  const [signInState, signInAction] = useActionState(
    signInWithEmailOtpAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  useEffect(() => {
    if (step === "email" && sendState.ok && sendState.email) {
      setEmailForCode(sendState.email);
      setStep("code");
    }
  }, [step, sendState.ok, sendState.email]);

  return (
    <AuthPageShell portal="app" journey="signin">
      <div className="flex flex-col gap-4">
        <Link
          href={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/signin"}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>

      <AuthCard
        title="Sign in with code"
        description="We’ll send a one-time code to your email. No password needed."
      >
        <div className="space-y-6">
          {step === "email" ? (
            <form action={sendFormAction} className="space-y-4">
              <AuthFormMessage state={sendState} />
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  aria-invalid={!!sendState.fieldErrors?.email?.length}
                />
                {sendState.fieldErrors?.email?.[0] ? (
                  <p className="text-sm text-destructive">
                    {sendState.fieldErrors.email[0]}
                  </p>
                ) : null}
              </div>
              <AuthSubmitButton>Send code</AuthSubmitButton>
            </form>
          ) : (
            <form action={signInAction} className="space-y-4">
              <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
              <AuthFormMessage state={signInState} />
              <div className="space-y-2">
                <Label htmlFor="email-readonly">Email</Label>
                <Input
                  id="email-readonly"
                  name="email"
                  type="email"
                  value={emailForCode}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Code</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={8}
                  aria-invalid={!!signInState.fieldErrors?.otp?.length}
                />
                {signInState.fieldErrors?.otp?.[0] ? (
                  <p className="text-sm text-destructive">
                    {signInState.fieldErrors.otp[0]}
                  </p>
                ) : null}
              </div>
              <AuthSubmitButton>Sign in</AuthSubmitButton>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("email")}
              >
                Use a different email
              </Button>
            </form>
          )}
        </div>
      </AuthCard>
    </AuthPageShell>
  );
}
