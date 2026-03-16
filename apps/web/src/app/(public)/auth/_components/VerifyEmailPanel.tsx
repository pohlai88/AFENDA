"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button, Spinner, toast } from "@afenda/ui";

import { sendVerificationEmail, useSession, verifyEmail } from "@/lib/auth/client";

import { AuthFeedback } from "./AuthFormPrimitives";
import { AuthPanelFrame } from "./AuthPanelFrame";
import { usePanelTitleFocus } from "./usePanelTitleFocus";

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
  const panelTitleRef = useRef<HTMLDivElement | null>(null);
  usePanelTitleFocus(panelTitleRef);

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
    <AuthPanelFrame
      title="Verify your email"
      titleRef={panelTitleRef}
      description={
        hasValidToken
          ? "AFENDA is confirming your verification link now."
          : "Your account is created. Verify your email address before continuing."
      }
      footer={
        <>
          <span>Destination after verification: {nextPath}</span>
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
          >
            Back to sign in
          </Link>
        </>
      }
    >
      {feedback ? (
        <AuthFeedback tone="success" role="status" ariaLive="polite">
          {feedback}
        </AuthFeedback>
      ) : null}

      {error ? (
        <AuthFeedback tone="error" role="alert" ariaLive="assertive">
          {error}
        </AuthFeedback>
      ) : null}

      {hasValidToken ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
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
    </AuthPanelFrame>
  );
}
