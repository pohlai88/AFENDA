import { eq, inArray } from "drizzle-orm";
import { authAnomalyAcknowledgements } from "@afenda/db";

import { publishAuthAuditEvent } from "../audit/audit.helpers";
import { getDbForAuth } from "../auth-db";

const ANOMALY_CODES = [
  "high_signin_failure_volume",
  "high_mfa_failure_volume",
  "failed_audit_backlog",
  "expired_challenge_backlog",
] as const;

export async function acknowledgeAnomaly(
  anomalyCode: string,
  actorUserId: string,
  note?: string,
): Promise<void> {
  const db = getDbForAuth();

  await db.insert(authAnomalyAcknowledgements).values({
    anomalyCode,
    acknowledgedBy: actorUserId,
    note: note ?? null,
  });

  await publishAuthAuditEvent("auth.ops.anomaly_acknowledged", {
    userId: actorUserId,
    metadata: { anomalyCode, note: note ?? null },
  });
}

/** Check if an anomaly code has been acknowledged. */
export async function isAnomalyAcknowledged(
  anomalyCode: string,
): Promise<boolean> {
  const db = getDbForAuth();

  const rows = await db
    .select({ id: authAnomalyAcknowledgements.id })
    .from(authAnomalyAcknowledgements)
    .where(eq(authAnomalyAcknowledgements.anomalyCode, anomalyCode))
    .limit(1);

  return rows.length > 0;
}

/** Get set of acknowledged anomaly codes (for filtering). */
export async function getAcknowledgedAnomalyCodes(): Promise<Set<string>> {
  const db = getDbForAuth();

  const rows = await db
    .selectDistinct({ code: authAnomalyAcknowledgements.anomalyCode })
    .from(authAnomalyAcknowledgements)
    .where(inArray(authAnomalyAcknowledgements.anomalyCode, [...ANOMALY_CODES]));

  return new Set(rows.map((r) => r.code));
}
