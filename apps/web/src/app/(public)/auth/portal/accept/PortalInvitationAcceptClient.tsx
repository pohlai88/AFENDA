"use client";

import { useState } from "react";
import Link from "next/link";
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
import { acceptPortalInvitationPublic } from "@/lib/public-auth";
import { AuthFooterLinks } from "../../_components/auth-footer-links";

const PORTAL_ACCEPT_ERRORS: Record<string, string> = {
  IAM_PORTAL_INVITATION_INVALID: "Invitation token is invalid. Please request a new invitation.",
  IAM_PORTAL_INVITATION_EXPIRED: "Invitation token has expired. Please request a new invitation.",
  IAM_EMAIL_ALREADY_REGISTERED:
    "An account already exists for this email. Sign in from the portal sign-in page.",
  Default: "Failed to accept invitation.",
};

export function PortalInvitationAcceptClient({ initialToken }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken ?? "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [signInPath, setSignInPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSignInPath(null);
    setError(null);
    try {
      const result = await acceptPortalInvitationPublic({
        idempotencyKey: crypto.randomUUID(),
        token,
        fullName,
        password,
      });

      if (result.portal === "supplier") {
        setSignInPath("/auth/portal/supplier/signin");
        return;
      }

      if (result.portal === "customer") {
        setSignInPath("/auth/portal/customer/signin");
        return;
      }

      setError("Portal type is not supported for this invitation.");
    } catch (err) {
      if (err instanceof Error) {
        setError(PORTAL_ACCEPT_ERRORS[err.name] ?? err.message ?? PORTAL_ACCEPT_ERRORS.Default);
        return;
      }
      setError(PORTAL_ACCEPT_ERRORS.Default ?? "Failed to accept invitation.");
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>Create your portal credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-2">
          <Label htmlFor="token">Token</Label>
          <Input id="token" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required />
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Button className="w-full">Activate portal access</Button>
        </form>

        {signInPath ? (
          <Alert>
            <AlertTitle>Invitation accepted</AlertTitle>
            <AlertDescription>
              Your portal access is ready.
              <Button asChild className="mt-3 w-full">
                <Link href={signInPath}>Continue to portal sign in</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {error ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

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
