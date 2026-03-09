"use client";

import { useState } from "react";
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
import { signUpPublic } from "@/lib/public-auth";
import { AuthFooterLinks } from "../_components/auth-footer-links";

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
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Create account</CardTitle>
        <CardDescription>Set up your AFENDA workspace in minutes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company</Label>
            <Input id="companyName" autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          {message ? <Alert><AlertTitle>Success</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
          {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Button className="w-full" disabled={isLoading}>{isLoading ? "Creating..." : "Create account"}</Button>
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
