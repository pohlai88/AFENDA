"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@afenda/ui";
import { deleteUserAction } from "@/app/auth/_actions/delete-user";
import { Trash2 } from "lucide-react";

const CONFIRM_TEXT = "DELETE";

/**
 * Delete account (Neon Auth) — Security settings. Irreversible; requires typing DELETE to confirm.
 */
export function DeleteAccountClient() {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmValue === CONFIRM_TEXT;

  async function handleDelete() {
    if (!canDelete) return;
    setStatus("loading");
    setError(null);
    const result = await deleteUserAction();
    if (result.ok) {
      setOpen(false);
      return;
    }
    setStatus("error");
    setError(result.error);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmValue("");
      setError(null);
      setStatus("idle");
    }
    setOpen(next);
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">
        Delete account
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Danger zone
          </CardTitle>
          <CardDescription className="text-xs">
            Once you delete your account, you will be signed out and will need to create a new account to use the service again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
              Delete my account
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible. All your account data will be permanently removed. Type <strong>{CONFIRM_TEXT}</strong> below to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2 py-2">
                <Label htmlFor="delete-confirm">Type {CONFIRM_TEXT} to confirm</Label>
                <Input
                  id="delete-confirm"
                  value={confirmValue}
                  onChange={(e) => setConfirmValue(e.target.value)}
                  placeholder={CONFIRM_TEXT}
                  className="font-mono"
                  autoComplete="off"
                  disabled={status === "loading"}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={status === "loading"}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={!canDelete || status === "loading"}
                  onClick={handleDelete}
                >
                  {status === "loading" ? "Deleting…" : "Delete account"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </section>
  );
}
