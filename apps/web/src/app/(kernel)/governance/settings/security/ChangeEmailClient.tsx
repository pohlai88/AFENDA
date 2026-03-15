"use client";

import { useState, useTransition } from "react";
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
  Spinner,
} from "@afenda/ui";
import { MailCheck } from "lucide-react";

import { changeEmailAction } from "./actions";

/**
 * Email change request panel using server action and server-owned Neon facade.
 */
export function ChangeEmailClient({ currentEmail }: { currentEmail?: string | null }) {
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("New email is required.");
      return;
    }

    const callbackURL =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/auth/verify-email?next=${encodeURIComponent("/governance/settings/security")}&email=${encodeURIComponent(normalizedEmail)}`;

    startTransition(async () => {
      try {
        await changeEmailAction({
          newEmail: normalizedEmail,
          callbackURL,
        });
        setSuccess(`Verification sent to ${normalizedEmail}.`);
        setNewEmail("");
      } catch (submitError) {
        const message =
          submitError instanceof Error && submitError.message
            ? submitError.message
            : "Unable to request email change.";
        setError(message);
      }
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Change email</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Request an email change. The new address must be verified before becoming active.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MailCheck className="h-4 w-4" />
            Update account email
          </CardTitle>
          <CardDescription className="text-xs">Server-owned email-change request with verification callback.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current email: {currentEmail ?? "Unavailable"}
          </p>

          {success ? (
            <Alert>
              <AlertTitle>Verification sent</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Email update failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="security-change-email">New email</Label>
              <Input
                id="security-change-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="new-address@example.com"
                disabled={isPending}
                required
              />
            </div>

            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Sending...
                </span>
              ) : (
                "Send verification"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
