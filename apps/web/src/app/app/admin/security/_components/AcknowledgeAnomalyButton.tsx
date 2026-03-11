"use client";

import { useState } from "react";
import { Button } from "@afenda/ui";
import { Loader2 } from "lucide-react";

export function AcknowledgeAnomalyButton({
  anomalyCode,
  onAcknowledged,
}: {
  anomalyCode: string;
  onAcknowledged?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleAcknowledge() {
    setLoading(true);
    try {
      const res = await fetch("/api/internal/security/acknowledge-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ anomalyCode }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error((data.message as string) ?? `Request failed: ${res.status}`);
      }
      onAcknowledged?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAcknowledge}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Acknowledge"}
    </Button>
  );
}
