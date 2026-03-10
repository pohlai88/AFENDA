"use client";

import { signOut } from "next-auth/react";
import { memo, useEffect } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
} from "@afenda/ui";
import { AUTH_CARD_CLASS } from "../_components/auth-card";
import { AuthHeader } from "../_components/auth-header";

const SIGNIN_CALLBACK = "/auth/signin";

export const SignOutClient = memo(function SignOutClient() {
  useEffect(() => {
    void signOut({ callbackUrl: SIGNIN_CALLBACK });
  }, []);

  return (
    <Card className={AUTH_CARD_CLASS}>
      <AuthHeader
        title="Signing out"
        description="Ending your session securely."
      />
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
});
