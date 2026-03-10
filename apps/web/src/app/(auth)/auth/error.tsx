"use client";

import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Separator,
} from "@afenda/ui";
import { ShieldX } from "lucide-react";
import { AUTH_CARD_CLASS } from "./_components/auth-card";
import { AuthFooterLinks, FOOTER_ERROR_LINKS } from "./_components/auth-footer-links";
import { AuthHeader } from "./_components/auth-header";

const DEFAULT_MESSAGE = "An authentication error occurred.";

export default function AuthErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || DEFAULT_MESSAGE;

  return (
    <Card className={AUTH_CARD_CLASS}>
      <AuthHeader
        title="Authentication error"
        description="Something went wrong during sign-in."
      />
      <CardContent className="space-y-5">
        <Alert variant="destructive">
          <ShieldX className="size-4" />
          <AlertTitle>Sign-in flow interrupted</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        {error.digest ? (
          <p className="text-xs font-mono text-muted-foreground">
            Error ID: {error.digest}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/signin">Back to sign in</Link>
          </Button>
        </div>

        <Separator />

        <AuthFooterLinks links={FOOTER_ERROR_LINKS} />
      </CardContent>
    </Card>
  );
}
