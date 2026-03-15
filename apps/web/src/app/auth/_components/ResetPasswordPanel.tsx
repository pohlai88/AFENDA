"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  toast,
} from "@afenda/ui";

import { resetPassword } from "@/lib/auth/client";
import {
  authCardFooterStyle,
  authCardSurfaceStyle,
  authFeedbackErrorStyle,
} from "@/app/auth/_components/surface-styles";

type ResetPasswordPanelProps = {
  nextPath: string;
  token?: string;
  initialError?: string;
  isAuthConfigured: boolean;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function ResetPasswordPanel({
  nextPath,
  token,
  initialError,
  isAuthConfigured,
}: ResetPasswordPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const hasValidToken = Boolean(token && token !== "INVALID_TOKEN");

  function handleSubmit(formData: FormData) {
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      return;
    }

    if (!hasValidToken) {
      setError("This password reset link is invalid or has expired.");
      return;
    }

    if (!newPassword) {
      setError("A new password is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await resetPassword({
        newPassword,
        token,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to reset password."));
        return;
      }

      toast.success("Password updated.");
      router.replace(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    });
  }

  return (
    <Card className="border" style={authCardSurfaceStyle}>
      <CardHeader className="space-y-3">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>
            Set a new password for your AFENDA account, then continue back to sign in.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="reset-password-new">New password</Label>
            <Input
              id="reset-password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password-confirm">Confirm new password</Label>
            <Input
              id="reset-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border px-3 py-2 text-sm" style={authFeedbackErrorStyle}>
              {error}
            </div>
          ) : null}

          {hasValidToken ? (
            <Button className="w-full" type="submit" disabled={isPending || !isAuthConfigured}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Updating password...
                </span>
              ) : (
                "Update password"
              )}
            </Button>
          ) : null}
        </form>
      </CardContent>
      <CardFooter
        className="flex items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground"
        style={authCardFooterStyle}
      >
        <span>Destination after recovery: {nextPath}</span>
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={`/auth/forgot-password?next=${encodeURIComponent(nextPath)}`}
        >
          Request a new link
        </Link>
      </CardFooter>
    </Card>
  );
}
