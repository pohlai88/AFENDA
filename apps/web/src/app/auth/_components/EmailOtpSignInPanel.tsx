"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  toast,
} from "@afenda/ui";

import { emailOtp, signIn } from "@/lib/auth/client";
import { buildPostSignInPath } from "@/lib/auth/redirects";
import {
  authCardFooterStyle,
  authCardSurfaceStyle,
  authFeedbackErrorStyle,
} from "@/app/auth/_components/surface-styles";

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
    <Card className="border" style={authCardSurfaceStyle}>
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Sign in with email code</CardTitle>
          <CardDescription>
            Request a one-time code and use it to complete sign in without your password.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {step === "email" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSendCode();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="otp-email">Email</Label>
              <Input
                id="otp-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operator@afenda.com"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border px-3 py-2 text-sm" style={authFeedbackErrorStyle}>
                {error}
              </div>
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
            onSubmit={(event) => {
              event.preventDefault();
              handleVerifyCode();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="otp-email-readonly">Email</Label>
              <Input
                id="otp-email-readonly"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp-code">Verification code</Label>
              <Input
                id="otp-code"
                name="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border px-3 py-2 text-sm" style={authFeedbackErrorStyle}>
                {error}
              </div>
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
      </CardContent>
      <CardFooter
        className="flex items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground"
        style={authCardFooterStyle}
      >
        <span>Destination after auth: {nextPath}</span>
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
        >
          Back to password sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
