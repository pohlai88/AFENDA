"use client";

import Link from "next/link";
import { memo, useState } from "react";
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
import { getAuthErrorMessage } from "@afenda/contracts";
import { ErrorAlert } from "@/components/ErrorAlert";
import { acceptPortalInvitationPublic } from "@/lib/public-auth";
import { AUTH_CARD_CLASS } from "../../_components/auth-card";
import { AuthFooterLinks, FOOTER_ERROR_LINKS } from "../../_components/auth-footer-links";
import { AuthHeader } from "../../_components/auth-header";
import { PasswordField } from "../../_components/password-field";
import { buildPortalSignInRedirect } from "@/platform/portals";

export const PortalInvitationAcceptClient = memo(function PortalInvitationAcceptClient({
  initialToken,
}: {
  initialToken?: string;
}) {
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

      const path = buildPortalSignInRedirect(result.portal);
      setSignInPath(path);
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
    <Card className={AUTH_CARD_CLASS}>
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

        <AuthFooterLinks links={FOOTER_ERROR_LINKS} />
      </CardContent>
    </Card>
  );
});
