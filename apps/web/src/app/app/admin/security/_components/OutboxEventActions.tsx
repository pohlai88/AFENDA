"use client";

import { useState } from "react";
import { Button } from "@afenda/ui";
import { Loader2 } from "lucide-react";

export function RetryOutboxButton({
  eventId,
  onDone,
}: {
  eventId: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    try {
      const res = await fetch("/api/internal/security/retry-outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error((data.message as string) ?? `Request failed: ${res.status}`);
      }
      if (data.ok) onDone?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry"}
    </Button>
  );
}

export function DeadLetterOutboxButton({
  eventId,
  onDone,
}: {
  eventId: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDeadLetter() {
    if (!confirm("Force dead-letter this event? It will not be retried.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/internal/security/dead-letter-outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error((data.message as string) ?? `Request failed: ${res.status}`);
      }
      if (data.ok) onDone?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDeadLetter}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dead Letter"}
    </Button>
  );
}
