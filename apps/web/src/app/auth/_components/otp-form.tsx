"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@afenda/ui";

interface OTPFormProps {
  onSubmit: (code: string) => void;
  onResend?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  helperText?: string;
  resendCooldownSeconds?: number;
}

const OTP_LENGTH = 6;

export function OTPForm({
  onSubmit,
  onResend,
  isLoading = false,
  error = null,
  helperText = "Enter the 6-digit verification code.",
  resendCooldownSeconds = 60,
}: OTPFormProps) {
  const [code, setCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const lastSubmittedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (code.length !== OTP_LENGTH || isLoading) return;
    if (lastSubmittedCodeRef.current === code) return;

    lastSubmittedCodeRef.current = code;
    onSubmit(code);
  }, [code, isLoading, onSubmit]);

  useEffect(() => {
    if (!isLoading && code.length < OTP_LENGTH) {
      lastSubmittedCodeRef.current = null;
    }
  }, [code, isLoading]);

  const handleResend = () => {
    if (!onResend) return;
    if (isPending || resendCountdown > 0) return;

    startTransition(async () => {
      try {
        await onResend();
        setResendCountdown(resendCooldownSeconds);
        setCode("");
        lastSubmittedCodeRef.current = null;
      } catch (err) {
        console.error("Resend failed:", err);
      }
    });
  };

  const canResend = resendCountdown === 0 && !isPending;
  const isBusy = isLoading || isPending;
  const showResend = typeof onResend === "function";

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <div className="flex justify-center">
          <InputOTP
            maxLength={OTP_LENGTH}
            value={code}
            onChange={setCode}
            disabled={isBusy}
            aria-label="One-time password"
            containerClassName="justify-center"
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot
                index={0}
                className="h-12 w-10 rounded-xl border border-border/70 bg-background text-base font-semibold shadow-sm"
              />
              <InputOTPSlot
                index={1}
                className="h-12 w-10 rounded-xl border border-border/70 bg-background text-base font-semibold shadow-sm"
              />
              <InputOTPSlot
                index={2}
                className="h-12 w-10 rounded-xl border border-border/70 bg-background text-base font-semibold shadow-sm"
              />
            </InputOTPGroup>

            <div className="w-2 sm:w-3" aria-hidden="true" />

            <InputOTPGroup className="gap-2">
              <InputOTPSlot
                index={3}
                className="h-12 w-10 rounded-xl border border-border/70 bg-background text-base font-semibold shadow-sm"
              />
              <InputOTPSlot
                index={4}
                className="h-12 w-10 rounded-xl border border-border/70 bg-background text-base font-semibold shadow-sm"
              />
              <InputOTPSlot
                index={5}
                className="h-12 w-10 rounded-xl border border-border/70 bg-background text-base font-semibold shadow-sm"
              />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          {helperText}
        </p>
      </div>

      {showResend ? (
        <div className="border-t border-border/70 pt-6">
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={!canResend}
              aria-disabled={!canResend}
              className="w-full"
            >
              {isPending
                ? "Sending…"
                : canResend
                  ? "Resend code"
                  : `Resend in ${resendCountdown}s`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}