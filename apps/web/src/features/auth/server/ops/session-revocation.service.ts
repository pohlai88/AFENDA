import { eq } from "drizzle-orm";
import { authSessionRevocations } from "@afenda/db";

import { publishAuthAuditEvent } from "../audit/audit.helpers";
import { getDbForAuth } from "../auth-db";

export async function revokeUserSession(
  targetUserId: string,
  actorUserId: string,
  reason?: string,
): Promise<void> {
  const db = getDbForAuth();

  await db.insert(authSessionRevocations).values({
    userId: targetUserId,
    revokedBy: actorUserId,
    reason: reason ?? null,
  });

  await publishAuthAuditEvent("auth.ops.session_revoked", {
    userId: actorUserId,
    metadata: { targetUserId, reason: reason ?? null },
  });
}

/** Check if a user has been revoked (for JWT callback). */
export async function isUserSessionRevoked(userId: string): Promise<boolean> {
  const db = getDbForAuth();

  const rows = await db
    .select({ id: authSessionRevocations.id })
    .from(authSessionRevocations)
    .where(eq(authSessionRevocations.userId, userId))
    .limit(1);

  return rows.length > 0;
}
