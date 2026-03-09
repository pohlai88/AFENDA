"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from "@afenda/ui";
import { requestPasswordResetPublic, resetPasswordPublic } from "@/lib/public-auth";
import { AuthFooterLinks } from "../_components/auth-footer-links";

export function ResetPasswordClient({ tokenFromQuery }: { tokenFromQuery?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromQuery ?? "");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"link" | "code">(tokenFromQuery ? "link" : "code");
  const [requestDelivery, setRequestDelivery] = useState<"link" | "code">("link");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await requestPasswordResetPublic({
        idempotencyKey: crypto.randomUUID(),
        email,
        delivery: requestDelivery,
      });
      router.push(
        requestDelivery === "code"
          ? "/auth/reset-password/status?state=codeSent"
          : "/auth/reset-password/status?state=linkSent",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request reset");
    }
  }

  async function doReset(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const submittedToken = mode === "code" ? code : token;
    if (!submittedToken.trim()) {
      setError(mode === "code" ? "Please enter the 6-digit code" : "Please enter the reset token");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (mode === "code" && !normalizedEmail) {
      setError("Please enter the account email for code verification");
      return;
    }

    try {
      await resetPasswordPublic({
        idempotencyKey: crypto.randomUUID(),
        token: submittedToken.trim(),
        email: mode === "code" ? normalizedEmail : undefined,
        newPassword,
      });
      router.push("/auth/reset-password/status?state=passwordUpdated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  function onCodeChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setCode(digitsOnly);
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Request a reset and set a new password in one place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={requestReset} className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={requestDelivery === "link" ? "default" : "outline"}
              onClick={() => setRequestDelivery("link")}
            >
              Email me a link
            </Button>
            <Button
              type="button"
              variant={requestDelivery === "code" ? "default" : "outline"}
              onClick={() => setRequestDelivery("code")}
            >
              Email me 6-digit code
            </Button>
          </div>
          <Button className="w-full">Send reset instructions</Button>
          <p className="text-xs text-muted-foreground">
            We will send reset instructions. Depending on your setup, email can contain either a reset link or a 6-digit code.
          </p>
        </form>

        <form onSubmit={doReset} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "code" ? "default" : "outline"}
              onClick={() => setMode("code")}
            >
              6-digit code
            </Button>
            <Button
              type="button"
              variant={mode === "link" ? "default" : "outline"}
              onClick={() => setMode("link")}
            >
              Link token
            </Button>
          </div>

          {mode === "code" ? (
            <>
              <Label htmlFor="verifyEmail">Account email</Label>
              <Input
                id="verifyEmail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="123456"
                required
              />
            </>
          ) : (
            <>
              <Label htmlFor="token">Token from email link</Label>
              <Input
                id="token"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </>
          )}

          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          <Button className="w-full">Reset password</Button>
        </form>

        {message ? <Alert><AlertTitle>Success</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <Separator />

        <AuthFooterLinks
          links={[
            { href: "/auth/signin", label: "Back to sign in" },
            { href: "/auth/signup", label: "Create account" },
          ]}
        />
      </CardContent>
    </Card>
  );
}
