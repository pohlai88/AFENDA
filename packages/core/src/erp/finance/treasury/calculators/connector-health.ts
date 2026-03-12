export function deriveConnectorHealth(params: {
  consecutiveFailureCount: number;
  lastSyncSucceededAt?: Date | null;
  lastSyncFailedAt?: Date | null;
}) {
  if (params.consecutiveFailureCount >= 3) return "failed" as const;
  if (params.consecutiveFailureCount > 0) return "degraded" as const;
  if (params.lastSyncSucceededAt) return "healthy" as const;
  return "unknown" as const;
}
