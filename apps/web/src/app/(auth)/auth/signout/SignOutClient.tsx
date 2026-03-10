"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle, Card, CardContent } from "@afenda/ui";
import { AuthHeader } from "../_components/auth-header";

export function SignOutClient() {
  useEffect(() => {
    void signOut({ callbackUrl: "/auth/signin" });
  }, []);

  return (
    <Card className="border-border/50 shadow-xl bg-card">
      <AuthHeader title="Signing out" />
      <CardContent>
        <Alert>
          <AlertTitle>Ending your session</AlertTitle>
          <AlertDescription>
            You will be redirected to sign in once your session is cleared.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
