"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Separator,
} from "@afenda/ui";
import { ErrorAlert } from "@/components/ErrorAlert";
import { getAuthErrorMessage } from "@afenda/contracts";
import { signUpPublic } from "@/lib/public-auth";
import { AuthFooterLinks } from "../_components/auth-footer-links";
import { AuthHeader } from "../_components/auth-header";
import { PasswordField } from "../_components/password-field";

export function SignUpFormClient() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsLoading(true);
    try {
      const result = await signUpPublic({
        idempotencyKey: crypto.randomUUID(),
        fullName,
        companyName,
        email,
        password,
      });
      setMessage(`Account created for org ${result.orgSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : getAuthErrorMessage("AUTH_SIGNUP_FAILED"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-xl bg-card">
      <AuthHeader
        title="Create account"
        description="Set up your AFENDA workspace in minutes."
      />
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company</Label>
            <Input
              id="companyName"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showStrength
            minLength={8}
            required
          />

          {message && (
            <Alert>
              <AlertTitle>Account created</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <ErrorAlert error={error} title="Registration failed" />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <Separator />

        <AuthFooterLinks
          links={[
            { href: "/auth/signin", label: "Back to sign in" },
            { href: "/auth/reset-password", label: "Reset password" },
          ]}
        />
      </CardContent>
    </Card>
  );
}
