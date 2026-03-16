"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button, Input, Spinner, toast } from "@afenda/ui";

import { emailOtp, signIn } from "@/lib/auth/client";
import { buildPostSignInPath } from "@/lib/auth/redirects";

import { AuthFeedback, AuthField } from "./AuthFormPrimitives";
import { AuthPanelFrame } from "./AuthPanelFrame";

type EmailOtpSignInPanelProps = {
  nextPath: string;
  initialEmail?: string;
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

export function EmailOtpSignInPanel({
  nextPath,
  initialEmail,
  isAuthConfigured,
}: EmailOtpSignInPanelProps) {
  const router = useRouter();
  const postSignInPath = buildPostSignInPath(nextPath);
  const [email, setEmail] = useState(initialEmail?.trim() ?? "");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const otpInputRef = useRef<HTMLInputElement | null>(null);
  const emailStepErrorId = "email-otp-email-step-error";
  const otpStepErrorId = "email-otp-verify-step-error";

  useEffect(() => {
    if (step === "otp") {
      otpInputRef.current?.focus();
      return;
    }

    emailInputRef.current?.focus();
  }, [step]);

  function handleSendCode() {
    const normalizedEmail = email.trim();
    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      return;
    }

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const api = emailOtp as unknown as {
        sendVerificationOtp?: (input: {
          email: string;
          type: string;
        }) => Promise<{ error?: unknown }>;
      };

      if (!api.sendVerificationOtp) {
        setError("Email OTP sign-in is unavailable in this environment.");
        return;
      }

      const response = await api.sendVerificationOtp({
        email: normalizedEmail,
        type: "sign-in",
      });

      if (response?.error) {
        setError(getErrorMessage(response.error, "Unable to send sign-in code."));
        return;
      }

      setStep("otp");
      toast.success("Sign-in code sent.");
    });
  }

  function handleVerifyCode() {
    const normalizedEmail = email.trim();
    const normalizedOtp = otp.trim();

    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      return;
    }

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    if (!normalizedOtp) {
      setError("Verification code is required.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await signIn.emailOtp({
        email: normalizedEmail,
        otp: normalizedOtp,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to sign in with code."));
        return;
      }

      toast.success("Signed in with email code.");
      router.replace(postSignInPath);
      router.refresh();
    });
  }

  return (
    <AuthPanelFrame
      title="Sign in with email code"
      description="Request a one-time code and use it to complete sign in without your password."
      footer={
        <>
          <span>Destination after auth: {nextPath}</span>
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
          >
            Back to password sign in
          </Link>
        </>
      }
    >
      {step === "email" ? (
        <form
          className="space-y-4"
          aria-busy={isPending}
          onSubmit={(event) => {
            event.preventDefault();
            handleSendCode();
          }}
        >
          <AuthField htmlFor="otp-email" label="Email">
            <Input
              id="otp-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@afenda.com"
              ref={emailInputRef}
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? emailStepErrorId : undefined}
              required
            />
          </AuthField>

          {error ? (
            <AuthFeedback id={emailStepErrorId} tone="error" role="alert" ariaLive="assertive">
              {error}
            </AuthFeedback>
          ) : null}

          <Button className="w-full" type="submit" disabled={isPending || !isAuthConfigured}>
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Sending code...
              </span>
            ) : (
              "Send sign-in code"
            )}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          aria-busy={isPending}
          onSubmit={(event) => {
            event.preventDefault();
            handleVerifyCode();
          }}
        >
          <AuthField htmlFor="otp-email-readonly" label="Email">
            <Input
              id="otp-email-readonly"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? otpStepErrorId : undefined}
              required
            />
          </AuthField>

          <AuthField htmlFor="otp-code" label="Verification code">
            <Input
              id="otp-code"
              name="otp"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              ref={otpInputRef}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? otpStepErrorId : undefined}
              required
            />
          </AuthField>

          {error ? (
            <AuthFeedback id={otpStepErrorId} tone="error" role="alert" ariaLive="assertive">
              {error}
            </AuthFeedback>
          ) : null}

          <div className="space-y-2">
            <Button className="w-full" type="submit" disabled={isPending || !isAuthConfigured}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Verifying code...
                </span>
              ) : (
                "Sign in with code"
              )}
            </Button>

            <Button
              className="w-full"
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setOtp("");
                setStep("email");
              }}
              disabled={isPending}
            >
              Use another email
            </Button>
          </div>
        </form>
      )}
    </AuthPanelFrame>
  );
}
