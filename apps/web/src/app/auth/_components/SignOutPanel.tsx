"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from "@afenda/ui";

import { signOut } from "@/lib/auth/client";
import {
  authCardSurfaceStyle,
  authFeedbackErrorStyle,
} from "@/app/auth/_components/surface-styles";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Unable to sign out.";
}

export function SignOutPanel() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSignOut() {
    setError(null);

    startTransition(async () => {
      const response = await signOut();
      if (response.error) {
        setError(getErrorMessage(response.error));
        return;
      }

      router.replace("/");
      router.refresh();
    });
  }

  useEffect(() => {
    runSignOut();
  }, []);

  return (
    <Card className="border" style={authCardSurfaceStyle}>
      <CardHeader>
        <CardTitle>Signing out</CardTitle>
        <CardDescription>Clearing the current Neon Auth session for this browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>{isPending ? "Signing out..." : "Preparing sign out..."}</span>
        </div>
        {error ? (
          <div className="rounded-xl border px-3 py-2 text-sm" style={authFeedbackErrorStyle}>
            {error}
          </div>
        ) : null}
        <Button type="button" variant="outline" onClick={runSignOut} disabled={isPending}>
          Retry sign out
        </Button>
      </CardContent>
    </Card>
  );
}
