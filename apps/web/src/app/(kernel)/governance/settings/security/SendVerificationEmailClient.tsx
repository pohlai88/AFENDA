"use client";

import { useTransition } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner, toast } from "@afenda/ui";
import { Mail } from "lucide-react";

import { sendVerificationEmail, useSession } from "@/lib/auth/client";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

/**
 * Send verification email (Neon Auth) — Security settings.
 */
export function SendVerificationEmailClient() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  function handleSendVerificationEmail() {
    const email = session?.user?.email;
    if (!email) {
      toast.error("Verification email is unavailable without an account email.");
      return;
    }

    const callbackURL = `${window.location.origin}/auth/verify-email?next=${encodeURIComponent(window.location.pathname)}&email=${encodeURIComponent(email)}`;

    startTransition(async () => {
      const response = await sendVerificationEmail({
        email,
        callbackURL,
      });

      if (response.error) {
        toast.error(getErrorMessage(response.error, "Unable to send verification email."));
        return;
      }

      toast.success("Verification email sent.");
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Email verification</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Send a verification link to your account email. Use this if you need to verify or re-verify
        your address.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4" />
            Send verification email
          </CardTitle>
          <CardDescription className="text-xs">Resend the verification link to your current account email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {session?.user?.email
              ? `Current verification target: ${session.user.email}.`
              : "Sign in to load the account email for verification."}
          </p>
          <Button type="button" onClick={handleSendVerificationEmail} disabled={isPending || !session?.user?.email}>
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Sending verification...
              </span>
            ) : (
              "Send verification email"
            )}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
