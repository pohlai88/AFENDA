"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, Spinner } from "@afenda/ui";

import { signOut } from "@/lib/auth/client";

import { AuthFeedback } from "./AuthFormPrimitives";
import { AuthPanelFrame } from "./AuthPanelFrame";
import { usePanelTitleFocus } from "./usePanelTitleFocus";

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
  const panelTitleRef = useRef<HTMLDivElement | null>(null);
  usePanelTitleFocus(panelTitleRef);

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
    <AuthPanelFrame
      title="Signing out"
      titleRef={panelTitleRef}
      description="Clearing the current Neon Auth session for this browser."
      contentClassName="space-y-4"
    >
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Spinner className="size-4" />
        <span>{isPending ? "Signing out..." : "Preparing sign out..."}</span>
      </div>
      {error ? (
        <AuthFeedback tone="error" role="alert" ariaLive="assertive">
          {error}
        </AuthFeedback>
      ) : null}
      <Button type="button" variant="outline" onClick={runSignOut} disabled={isPending}>
        Retry sign out
      </Button>
    </AuthPanelFrame>
  );
}
