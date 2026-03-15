"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Spinner,
  toast,
} from "@afenda/ui";

import { sendVerificationEmail, useSession, verifyEmail } from "@/lib/auth/client";
import {
  authCardFooterStyle,
  authCardSurfaceStyle,
  authFeedbackErrorStyle,
  authFeedbackSuccessStyle,
} from "@/app/auth/_components/surface-styles";

type VerifyEmailPanelProps = {
  nextPath: string;
  callbackUrl: string;
  email?: string;
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

export function VerifyEmailPanel({
  nextPath,
  callbackUrl,
  email,
  token,
  initialError,
  isAuthConfigured,
}: VerifyEmailPanelProps) {
  const router = useRouter();
  const attemptedVerificationRef = useRef(false);
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [feedback, setFeedback] = useState<string | null>(
    token ? null : "Verify your email address to finish activating your AFENDA account.",
  );
  const [isResending, startResending] = useTransition();
  const [isVerifying, startVerifying] = useTransition();

  const resendEmail = email ?? session?.user?.email ?? null;
  const hasValidToken = Boolean(token && token !== "INVALID_TOKEN");

  useEffect(() => {
    if (!hasValidToken || attemptedVerificationRef.current) {
      return;
    }

    attemptedVerificationRef.current = true;
    setFeedback("Verifying your email address...");
    setError(null);

    startVerifying(async () => {
      const response = await verifyEmail({
        query: {
          token: token as string,
        },
      });

      if (response.error) {
        setFeedback(null);
        setError(getErrorMessage(response.error, "Unable to verify email."));
        return;
      }

      toast.success("Email verified.");
      router.replace(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    });
  }, [hasValidToken, nextPath, router, token]);

  function handleResend() {
    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      return;
    }

    if (!resendEmail) {
      setError("Email verification is unavailable without an account email.");
      return;
    }

    setError(null);

    startResending(async () => {
      const response = await sendVerificationEmail({
        email: resendEmail,
        callbackURL: callbackUrl,
      });

      if (response.error) {
        setFeedback(null);
        setError(getErrorMessage(response.error, "Unable to resend verification email."));
        return;
      }

      setFeedback("Verification email sent. Check your inbox for the latest link.");
    });
  }

  return (
    <Card className="border" style={authCardSurfaceStyle}>
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            {hasValidToken
              ? "AFENDA is confirming your verification link now."
              : "Your account is created. Verify your email address before continuing."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
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

        {hasValidToken ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            <span>{isVerifying ? "Verifying email..." : "Waiting for verification..."}</span>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              {resendEmail
                ? `Verification email will be sent to ${resendEmail}.`
                : "AFENDA can resend the verification link once an email address is available."}
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || !isAuthConfigured}
            >
              {isResending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Resending verification...
                </span>
              ) : (
                "Resend verification email"
              )}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter
        className="flex items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground"
        style={authCardFooterStyle}
      >
        <span>Destination after verification: {nextPath}</span>
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
