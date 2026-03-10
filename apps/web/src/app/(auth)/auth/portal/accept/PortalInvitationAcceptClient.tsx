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
  Input,
  Label,
  Separator,
} from "@afenda/ui";
import { ErrorAlert } from "@/components/ErrorAlert";
import { getAuthErrorMessage } from "@afenda/contracts";
import { acceptPortalInvitationPublic } from "@/lib/public-auth";
import { AuthFooterLinks } from "../../_components/auth-footer-links";
import { AuthHeader } from "../../_components/auth-header";
import { PasswordField } from "../../_components/password-field";

export function PortalInvitationAcceptClient({ initialToken }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken ?? "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [signInPath, setSignInPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSignInPath(null);
    setError(null);
    setIsLoading(true);
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

      setError(getAuthErrorMessage("AUTH_PORTAL_TYPE_UNSUPPORTED"));
    } catch (err) {
      if (err instanceof Error) {
        setError(getAuthErrorMessage(err.name));
        return;
      }
      setError(getAuthErrorMessage("AUTH_PORTAL_ACCEPT_FAILED"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-xl bg-card">
      <AuthHeader
        title="Accept invitation"
        description="Create your portal credentials to get started."
      />
      <CardContent className="space-y-5">
        {!signInPath ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Invitation token</Label>
              <Input
                id="token"
                autoComplete="off"
                placeholder="Paste token from your invitation email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
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

            <PasswordField
              id="password"
              label="Create password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              showStrength
              minLength={8}
              required
            />

            <ErrorAlert error={error} />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Activating…" : "Activate portal access"}
            </Button>
          </form>
        ) : (
          <Alert>
            <AlertTitle>Invitation accepted</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>Your portal access is ready.</p>
              <Button asChild className="w-full">
                <Link href={signInPath}>Continue to portal sign in</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
