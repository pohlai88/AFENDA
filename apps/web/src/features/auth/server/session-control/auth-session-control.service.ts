import type { RevokeSessionsInput } from "./auth-session-control.types";
import { publishAuthAuditEvent } from "../audit/audit.helpers";

export async function revokeUserSessions(
  input: RevokeSessionsInput,
): Promise<void> {
  // TODO: integrate with AFENDA auth backend or session store
  // Examples:
  // - revoke all sessions for targetUserId
  // - revoke all sessions for tenantId
  // - revoke all sessions for targetUserId + portal

  await publishAuthAuditEvent("auth.signout", {
    userId: input.actorUserId,
    errorCode: "SESSIONS_REVOKED_BY_OPERATOR",
    metadata: {
      targetUserId: input.targetUserId ?? null,
      tenantId: input.tenantId ?? null,
      portal: input.portal ?? null,
      reason: input.reason,
    },
  });
}
