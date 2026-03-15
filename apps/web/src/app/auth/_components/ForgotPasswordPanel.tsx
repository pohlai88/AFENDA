"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
} from "@afenda/ui";

import { requestPasswordReset } from "@/lib/auth/client";
import {
  authCardFooterStyle,
  authCardSurfaceStyle,
  authFeedbackErrorStyle,
  authFeedbackSuccessStyle,
} from "@/app/auth/_components/surface-styles";

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
    <Card className="border" style={authCardSurfaceStyle}>
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>
            Enter your email address and AFENDA will send a reset link if the account exists.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input
              id="forgot-password-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="operator@afenda.com"
              required
            />
          </div>

          {feedback ? (
            <div className="rounded-xl border px-3 py-2 text-sm" style={authFeedbackSuccessStyle}>
              {feedback}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border px-3 py-2 text-sm" style={authFeedbackErrorStyle}>
              {error}
            </div>
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
      </CardContent>
      <CardFooter
        className="flex items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground"
        style={authCardFooterStyle}
      >
        <span>Destination after recovery: {nextPath}</span>
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
