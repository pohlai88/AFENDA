"use client";

/**
 * Global error boundary — catches unhandled errors in the entire app.
 *
 * Next.js requires this file to be a client component. It replaces the
 * root <html> element when an error occurs, so it must render a full
 * HTML document structure.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-black text-white hover:bg-black/90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
