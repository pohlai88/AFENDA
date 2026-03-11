"use client";

import { useState } from "react";
import { Button } from "@afenda/ui";
import { Loader2 } from "lucide-react";

export function RevokeChallengeButton({
  challengeId,
  onRevoked,
}: {
  challengeId: string;
  onRevoked?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm("Revoke this challenge? The user will need a new code.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/internal/security/revoke-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challengeId, reason: "manual_review" }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error((data.message as string) ?? `Request failed: ${res.status}`);
      }
      if (data.ok) onRevoked?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRevoke}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
    </Button>
  );
}
