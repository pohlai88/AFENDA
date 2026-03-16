"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, Input, Spinner } from "@afenda/ui";

import { requestPasswordReset } from "@/lib/auth/client";

import { AuthFeedback, AuthField } from "./AuthFormPrimitives";
import { AuthPanelFrame } from "./AuthPanelFrame";

type ForgotPasswordPanelProps = {
  nextPath: string;
  resetRedirectUrl: string;
  initialError?: string;
  isAuthConfigured: boolean;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function ForgotPasswordPanel({
  nextPath,
  resetRedirectUrl,
  initialError,
  isAuthConfigured,
}: ForgotPasswordPanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();
  const formErrorId = "forgot-password-error";
  const formFeedbackId = "forgot-password-feedback";

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();

    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      setFeedback(null);
      return;
    }

    if (!email) {
      setError("Email is required.");
      setFeedback(null);
      return;
    }

    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const response = await requestPasswordReset({
        email,
        redirectTo: resetRedirectUrl,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to send reset instructions."));
        return;
      }

      setFeedback(
        "If an account exists for that email, password reset instructions have been sent.",
      );
    });
  }

  return (
    <AuthPanelFrame
      title="Reset your password"
      description="Enter your email address and AFENDA will send a reset link if the account exists."
      footer={
        <>
          <span>Destination after recovery: {nextPath}</span>
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        aria-busy={isPending}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <AuthField htmlFor="forgot-password-email" label="Email">
          <Input
            id="forgot-password-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="operator@afenda.com"
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? formErrorId : feedback ? formFeedbackId : undefined}
            required
          />
        </AuthField>

        {feedback ? (
          <AuthFeedback id={formFeedbackId} tone="success" role="status" ariaLive="polite">
            {feedback}
          </AuthFeedback>
        ) : null}

        {error ? (
          <AuthFeedback id={formErrorId} tone="error" role="alert" ariaLive="assertive">
            {error}
          </AuthFeedback>
        ) : null}

        <Button className="w-full" type="submit" disabled={isPending || !isAuthConfigured}>
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              Sending instructions...
            </span>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthPanelFrame>
  );
}
