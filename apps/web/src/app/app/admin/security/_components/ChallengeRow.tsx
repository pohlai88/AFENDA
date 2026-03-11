"use client";

import { useRouter } from "next/navigation";
import type { SecurityChallengeListItem } from "@/features/auth/server/ops/auth-ops.types";
import { RevokeChallengeButton } from "./RevokeChallengeButton";

export function ChallengeRow({ item }: { item: SecurityChallengeListItem }) {
  const router = useRouter();
  const canRevoke = !item.revoked && !item.consumedAt;

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div>
        <div className="font-medium">
          {item.type.toUpperCase()} · {item.email ?? "—"}
        </div>
        <div className="text-sm text-muted-foreground">
          token: {item.tokenHint ?? "—"} · portal: {item.portal ?? "—"} · attempts:{" "}
          {item.attemptCount}/{item.maxAttempts}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">
          {item.revoked
            ? "Revoked"
            : item.consumedAt
              ? "Consumed"
              : "Active"}
        </div>
        {canRevoke && (
          <RevokeChallengeButton
            challengeId={item.id}
            onRevoked={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}
