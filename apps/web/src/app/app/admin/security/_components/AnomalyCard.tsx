"use client";

import { useRouter } from "next/navigation";
import type { AuthAnomalyFinding } from "@/features/auth/server/anomaly/auth-anomaly.types";
import { AcknowledgeAnomalyButton } from "./AcknowledgeAnomalyButton";

export function AnomalyCard({ finding }: { finding: AuthAnomalyFinding }) {
  const router = useRouter();
  const onAcknowledged = () => router.refresh();
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div>
        <div className="font-medium">{finding.message}</div>
        <div className="text-sm text-muted-foreground">
          Severity: {finding.severity} · Value: {finding.value} · Threshold:{" "}
          {finding.threshold}
        </div>
      </div>
      <AcknowledgeAnomalyButton
        anomalyCode={finding.code}
        onAcknowledged={onAcknowledged}
      />
    </div>
  );
}
