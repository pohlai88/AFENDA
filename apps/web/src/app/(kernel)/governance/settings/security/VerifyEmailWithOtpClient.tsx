"use client";

import { useActionState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@afenda/ui";
import { verifyEmailWithOtpAction } from "@/app/auth/_actions/email-otp";
import { INITIAL_AUTH_ACTION_STATE } from "@/app/auth/_lib/auth-state";
import { CheckCircle } from "lucide-react";

/**
 * Verify email with OTP code (Neon Auth emailOtp.verifyEmail) — Security settings.
 * Use after "Send verification email" when the user has received the code.
 */
export function VerifyEmailWithOtpClient({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, isPending] = useActionState(
    verifyEmailWithOtpAction,
    INITIAL_AUTH_ACTION_STATE,
  );

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Verify email with code</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Enter the code you received by email to verify your address. Send a verification email first
        if you have not received one.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Enter verification code
          </CardTitle>
          <CardDescription className="text-xs">
            We sent a code to your email. Enter it below to verify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="verify-email">Email</Label>
              <Input
                id="verify-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                defaultValue={defaultEmail}
                disabled={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="verify-otp">Verification code</Label>
              <Input
                id="verify-otp"
                name="otp"
                type="text"
                placeholder="123456"
                autoComplete="one-time-code"
                disabled={isPending}
                required
              />
            </div>
            {state.message && (
              <p className={`text-sm ${state.ok ? "text-primary" : "text-destructive"}`}>
                {state.message}
              </p>
            )}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Verifying…" : "Verify email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
