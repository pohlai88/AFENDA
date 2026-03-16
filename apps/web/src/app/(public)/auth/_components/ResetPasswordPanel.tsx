"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Input, Spinner, toast } from "@afenda/ui";

import { resetPassword } from "@/lib/auth/client";

import { AuthFeedback, AuthField } from "./AuthFormPrimitives";
import { AuthPanelFrame } from "./AuthPanelFrame";

type ResetPasswordPanelProps = {
  nextPath: string;
  token?: string;
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

export function ResetPasswordPanel({
  nextPath,
  token,
  initialError,
  isAuthConfigured,
}: ResetPasswordPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();
  const formErrorId = "reset-password-error";

  const hasValidToken = Boolean(token && token !== "INVALID_TOKEN");

  function handleSubmit(formData: FormData) {
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      return;
    }

    if (!hasValidToken) {
      setError("This password reset link is invalid or has expired.");
      return;
    }

    if (!newPassword) {
      setError("A new password is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await resetPassword({
        newPassword,
        token,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to reset password."));
        return;
      }

      toast.success("Password updated.");
      router.replace(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    });
  }

  return (
    <AuthPanelFrame
      title="Choose a new password"
      description="Set a new password for your AFENDA account, then continue back to sign in."
      footer={
        <>
          <span>Destination after recovery: {nextPath}</span>
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={`/auth/forgot-password?next=${encodeURIComponent(nextPath)}`}
          >
            Request a new link
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
        <AuthField htmlFor="reset-password-new" label="New password">
          <Input
            id="reset-password-new"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? formErrorId : undefined}
            required
          />
        </AuthField>

        <AuthField htmlFor="reset-password-confirm" label="Confirm new password">
          <Input
            id="reset-password-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? formErrorId : undefined}
            required
          />
        </AuthField>

        {error ? (
          <AuthFeedback id={formErrorId} tone="error" role="alert" ariaLive="assertive">
            {error}
          </AuthFeedback>
        ) : null}

        {hasValidToken ? (
          <Button className="w-full" type="submit" disabled={isPending || !isAuthConfigured}>
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Updating password...
              </span>
            ) : (
              "Update password"
            )}
          </Button>
        ) : null}
      </form>
    </AuthPanelFrame>
  );
}
