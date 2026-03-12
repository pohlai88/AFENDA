"use client";

import { useEffect, useState } from "react";

interface DebugPayload {
  hasNeonSession: boolean;
  hasAfendaSession: boolean;
  email: string | null;
  neonError?: string;
  hint?: string;
}

/**
 * Dev-only banner: when ?debug_session=1 is present, fetches /api/debug-session
 * and shows Neon vs AFENDA session state (for OAuth troubleshooting).
 */
export function AuthSessionDebugBanner() {
  const [payload, setPayload] = useState<DebugPayload | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug_session") !== "1") return;
    setShow(true);
    fetch("/api/debug-session")
      .then((r) => r.json())
      .then((data: DebugPayload) => setPayload(data))
      .catch(() => setPayload({ hasNeonSession: false, hasAfendaSession: false, email: null }));
  }, []);

  if (!show || !payload) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-border bg-muted px-3 py-2 text-left font-mono text-xs text-foreground"
    >
      <div className="font-semibold">Session debug (dev)</div>
      <div className="mt-1">
        Neon session: {payload.hasNeonSession ? "yes" : "no"}
        {payload.email != null && ` (${payload.email})`}
      </div>
      <div>AFENDA session: {payload.hasAfendaSession ? "yes" : "no"}</div>
      {payload.neonError && (
        <div className="mt-1 text-destructive">Neon error: {payload.neonError}</div>
      )}
      {payload.hint && <div className="mt-1 text-muted-foreground">{payload.hint}</div>}
    </div>
  );
}
