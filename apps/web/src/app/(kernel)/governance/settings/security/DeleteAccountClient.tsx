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
import { Trash2 } from "lucide-react";

import { deleteAccountAction } from "./actions";

/**
 * Delete account (Neon Auth) — Security settings. Irreversible; requires typing DELETE to confirm.
 */
export function DeleteAccountClient() {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canDelete = confirmation.trim().toUpperCase() === "DELETE";

  function handleDeleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canDelete) {
      setError("Type DELETE to confirm account removal.");
      return;
    }

    startTransition(async () => {
      try {
        await deleteAccountAction();
        setSuccess("Account deletion completed. You can now close this session.");
      } catch (deleteError) {
        const message =
          deleteError instanceof Error && deleteError.message
            ? deleteError.message
            : "Delete-account flow failed.";
        setError(message);
      }
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Delete account</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
            <Trash2 className="h-4 w-4" />
            Danger zone
          </CardTitle>
          <CardDescription className="text-xs">
            This action permanently removes your user account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <Alert>
              <AlertTitle>Account deleted</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Delete failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleDeleteAccount}>
            <div className="space-y-1.5">
              <Label htmlFor="security-delete-confirmation">Type DELETE to confirm</Label>
              <Input
                id="security-delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                disabled={isPending}
                required
              />
            </div>

            <Button type="submit" variant="destructive" size="sm" disabled={!canDelete || isPending}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Deleting...
                </span>
              ) : (
                "Delete account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
