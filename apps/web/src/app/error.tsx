"use client";

import { useEffect } from "react";
import { Button, Card, CardContent } from "@afenda/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              {error.message || "An unexpected error occurred"}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => reset()} size="lg">
              Try again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline" size="lg">
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
