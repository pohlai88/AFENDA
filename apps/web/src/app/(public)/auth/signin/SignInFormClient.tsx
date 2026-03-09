"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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
import { AuthFooterLinks } from "../_components/auth-footer-links";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  IAM_CREDENTIALS_INVALID: "Invalid email or password.",
  IAM_PORTAL_INVITATION_REQUIRED:
    "This portal account is not activated yet. Accept your invitation first.",
  IAM_PORTAL_INVITATION_EXPIRED:
    "Your portal invitation has expired. Ask your administrator for a new invitation.",
  IAM_PORTAL_INVITATION_INVALID: "Invitation token is invalid. Please request a fresh invitation.",
  AUTH_UPSTREAM_UNAVAILABLE: "Authentication service is temporarily unavailable. Please try again.",
  AUTH_INVALID_RESPONSE: "Authentication failed due to an invalid server response.",
  Default: "An error occurred during sign in.",
};

export function SignInFormClient({
  callbackUrl = "/",
  error,
  portal = "app",
}: {
  callbackUrl?: string;
  error?: string;
  portal?: "app" | "supplier" | "customer";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const resolvedError = submitError ?? error;
  const errorMessage = resolvedError ? ERROR_MESSAGES[resolvedError] ?? ERROR_MESSAGES.Default : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setSubmitError(null);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        portal,
        callbackUrl,
        redirect: false,
      });

      if (!result) {
        setSubmitError("Default");
        return;
      }

      if (result.error) {
        setSubmitError(result.error);
        return;
      }

      if (!result.ok) {
        setSubmitError("Default");
        return;
      }

      if (result.url && result.url.includes("/auth/error")) {
        const maybeError = new URL(result.url, window.location.origin).searchParams.get("error");
        setSubmitError(maybeError && maybeError.length > 0 ? maybeError : "Default");
        return;
      }

      router.push(result.url ?? callbackUrl);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {portal === "app" ? "Access AFENDA workspace" : `Access ${portal} portal`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Sign in failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <Separator />

        <AuthFooterLinks
          links={
            portal === "app"
              ? [
                  { href: "/auth/reset-password", label: "Forgot password?" },
                  { href: "/auth/signup", label: "Create account" },
                ]
              : [
                  { href: "/auth/reset-password", label: "Forgot password?" },
                  { href: "/auth/portal/accept", label: "Accept invitation" },
                ]
          }
        />
      </CardContent>
    </Card>
  );
}
