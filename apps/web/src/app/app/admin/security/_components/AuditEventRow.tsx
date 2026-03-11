"use client";

import { useRouter } from "next/navigation";
import type { SecurityAuditEventListItem } from "@/features/auth/server/ops/auth-ops.types";
import {
  DeadLetterOutboxButton,
  RetryOutboxButton,
} from "./OutboxEventActions";

export function AuditEventRow({ item }: { item: SecurityAuditEventListItem }) {
  const router = useRouter();
  const canRetry = item.status === "failed";
  const canDeadLetter = item.status === "failed" || item.status === "pending";

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{item.eventType}</div>
        <div className="text-sm text-muted-foreground">
          status: {item.status} · attempts: {item.attemptCount} · aggregate:{" "}
          {item.aggregateType}/{item.aggregateId ?? "—"}
        </div>
        {item.errorMessage ? (
          <div className="mt-1 text-sm text-destructive">{item.errorMessage}</div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-2">
        {canRetry && (
          <RetryOutboxButton eventId={item.id} onDone={() => router.refresh()} />
        )}
        {canDeadLetter && (
          <DeadLetterOutboxButton
            eventId={item.id}
            onDone={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}
