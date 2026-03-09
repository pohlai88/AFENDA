"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function SignOutClient() {
  useEffect(() => {
    void signOut({ callbackUrl: "/auth/signin" });
  }, []);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Signing Out</CardTitle>
      </CardHeader>
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
