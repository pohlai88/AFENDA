"use client";

import { useEffect } from "react";
import { AlertTriangle, Button } from "@afenda/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-8">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Admin page error</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {error.message || "An unexpected error occurred in the admin panel"}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-1">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/admin")} variant="outline">
          Go to admin
        </Button>
      </div>
    </div>
  );
}
