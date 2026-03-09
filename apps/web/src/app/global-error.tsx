"use client";

import { useEffect } from "react";

/**
 * Global error boundary — catches unhandled errors in the entire app.
 *
 * Next.js requires this file to be a client component. It replaces the
 * root <html> element when an error occurs, so it must render a full
 * HTML document structure. Cannot import @afenda/ui here (bundling
 * constraints at error boundary level), so uses minimal inline styles.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Let the browser error pipeline capture unhandled production diagnostics.
    if (typeof window !== "undefined" && typeof window.reportError === "function") {
      window.reportError(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: "28rem", width: "100%", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem", opacity: 0.7 }}>
              An unexpected error occurred. Please try again.
            </p>
            <p style={{ fontSize: "0.75rem", marginBottom: "1rem", opacity: 0.6 }}>
              {error.message || "Unknown application error"}
            </p>
            {error.digest && (
              <p style={{ fontSize: "0.75rem", fontFamily: "monospace", marginBottom: "1rem", opacity: 0.5 }}>
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
              <button
                onClick={reset}
                style={{ padding: "0.5rem 1.5rem", borderRadius: "0.375rem", background: "var(--foreground, hsl(0 0% 5%))", color: "var(--background, hsl(0 0% 99%))", fontSize: "0.875rem", cursor: "pointer", border: "none" }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.assign("/")}
                style={{ padding: "0.5rem 1.5rem", borderRadius: "0.375rem", background: "transparent", color: "inherit", fontSize: "0.875rem", cursor: "pointer", border: "1px solid currentColor" }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
