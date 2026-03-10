"use client";

import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
  Separator,
} from "@afenda/ui";
import { getAuthErrorMessage } from "@afenda/contracts";
import { ErrorAlert } from "@/components/ErrorAlert";
import { requestPasswordResetPublic, resetPasswordPublic } from "@/lib/public-auth";
import { AUTH_CARD_CLASS } from "../_components/auth-card";
import { AuthFooterLinks, FOOTER_RESET_LINKS } from "../_components/auth-footer-links";
import { AuthHeader } from "../_components/auth-header";
import { PasswordField } from "../_components/password-field";

type Step = "request" | "verify-code" | "verify-link";

const BACK_LINK_CLASS = "text-muted-foreground text-xs h-auto p-0";

export const ResetPasswordClient = memo(function ResetPasswordClient({
  tokenFromQuery,
}: {
  tokenFromQuery?: string;
}) {
  const router = useRouter();

  // If a token is pre-filled from URL, skip to the link-verify step
  const [step, setStep] = useState<Step>(tokenFromQuery ? "verify-link" : "request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromQuery ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requestDelivery, setRequestDelivery] = useState<"link" | "code">("link");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await requestPasswordResetPublic({
        idempotencyKey: crypto.randomUUID(),
        email,
        delivery: requestDelivery,
      });
      // Advance to confirmation step directly rather than redirect
      router.push(
        requestDelivery === "code"
          ? "/auth/reset-password/status?state=codeSent"
          : "/auth/reset-password/status?state=linkSent",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : getAuthErrorMessage("AUTH_RESET_REQUEST_FAILED"));
      setIsLoading(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const submittedToken = step === "verify-code" ? code : token;

    if (!submittedToken.trim()) {
      setError(
        step === "verify-code"
          ? getAuthErrorMessage("VALIDATION_CODE_REQUIRED")
          : getAuthErrorMessage("VALIDATION_TOKEN_REQUIRED"),
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (step === "verify-code" && !normalizedEmail) {
      setError(getAuthErrorMessage("VALIDATION_EMAIL_REQUIRED"));
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordPublic({
        idempotencyKey: crypto.randomUUID(),
        token: submittedToken.trim(),
        email: step === "verify-code" ? normalizedEmail : undefined,
        newPassword,
      });
      router.push("/auth/reset-password/status?state=passwordUpdated");
    } catch (err) {
      setError(err instanceof Error ? err.message : getAuthErrorMessage("AUTH_RESET_FAILED"));
      setIsLoading(false);
    }
  }

  return (
    <Card className={AUTH_CARD_CLASS}>
      <AuthHeader
        title="Reset password"
        description={
          step === "request"
            ? "Enter your email to receive reset instructions."
            : step === "verify-code"
              ? "Enter the 6-digit code and set a new password."
              : "Enter the token from your email and set a new password."
        }
      />
      <CardContent className="space-y-5">
        {/* ── Step 1: Request ── */}
        {step === "request" && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>How would you like to reset?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={requestDelivery === "link" ? "default" : "outline"}
                  onClick={() => setRequestDelivery("link")}
                  className="h-auto py-3 flex-col gap-1"
                >
                  <span className="font-medium">Email link</span>
                  <span className="text-xs opacity-70">Click to reset</span>
                </Button>
                <Button
                  type="button"
                  variant={requestDelivery === "code" ? "default" : "outline"}
                  onClick={() => setRequestDelivery("code")}
                  className="h-auto py-3 flex-col gap-1"
                >
                  <span className="font-medium">6-digit code</span>
                  <span className="text-xs opacity-70">Enter manually</span>
                </Button>
              </div>
            </div>

            <ErrorAlert error={error} />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending…" : "Send reset instructions"}
            </Button>

            <p className="text-center">
              <Button
                type="button"
                variant="link"
                size="sm"
                className={BACK_LINK_CLASS}
                onClick={() => setStep(requestDelivery === "code" ? "verify-code" : "verify-link")}
              >
                Already have a code or token?
              </Button>
            </p>
          </form>
        )}

        {/* ── Step 2a: Verify via 6-digit code ── */}
        {step === "verify-code" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verifyEmail">Account email</Label>
              <Input
                id="verifyEmail"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <InputOTP
                id="code"
                maxLength={6}
                value={code}
                onChange={(val) => setCode(val.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <PasswordField
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              showStrength
              minLength={8}
              required
            />

            <ErrorAlert error={error} />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting…" : "Reset password"}
            </Button>

            <p className="text-center">
              <Button
                type="button"
                variant="link"
                size="sm"
                className={BACK_LINK_CLASS}
                onClick={() => setStep("request")}
              >
                ← Back to request form
              </Button>
            </p>
          </form>
        )}

        {/* ── Step 2b: Verify via link token ── */}
        {step === "verify-link" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Reset token</Label>
              <Input
                id="token"
                autoComplete="off"
                placeholder="Paste token from your email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>

            <PasswordField
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              showStrength
              minLength={8}
              required
            />

            <ErrorAlert error={error} />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting…" : "Reset password"}
            </Button>

            {!tokenFromQuery && (
              <p className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className={BACK_LINK_CLASS}
                  onClick={() => setStep("request")}
                >
                  ← Back to request form
                </Button>
              </p>
            )}
          </form>
        )}

        <Separator />

        <AuthFooterLinks links={FOOTER_RESET_LINKS} />
      </CardContent>
    </Card>
  );
});
