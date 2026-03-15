"use client";

import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { CheckCircle } from "lucide-react";

/**
 * Verification completion guidance — Security settings.
 * Public email verification now completes in the dedicated /auth/verify-email flow.
 */
export function VerifyEmailWithOtpClient({ defaultEmail }: { defaultEmail?: string }) {
  const href = `/auth/verify-email?next=${encodeURIComponent("/governance/settings/security")}${
    defaultEmail ? `&email=${encodeURIComponent(defaultEmail)}` : ""
  }`;

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Complete verification</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Verification now completes through the public auth verification screen so the same callback
        and resend flow works for both new accounts and existing users.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Open verification flow
          </CardTitle>
          <CardDescription className="text-xs">Use this to resend the email or consume a fresh verification link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {defaultEmail
              ? `Open the verification flow for ${defaultEmail}.`
              : "Open the verification flow and resend the link if needed."}
          </p>
          <Button asChild type="button">
            <Link href={href}>Open verification screen</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
