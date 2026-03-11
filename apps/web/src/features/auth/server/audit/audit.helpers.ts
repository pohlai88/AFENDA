import type { AuthAuditContext, AuthAuditEventType } from "./audit.types";
import { getAuthAuditService } from "./audit.service";

export async function publishAuthAuditEvent(
  type: AuthAuditEventType,
  context: AuthAuditContext,
): Promise<void> {
  await getAuthAuditService().publish({
    type,
    context,
  });
}
