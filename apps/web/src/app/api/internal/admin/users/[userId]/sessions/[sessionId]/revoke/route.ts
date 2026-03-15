import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../../../../../_lib/authorization";
import type { AdminUserSessionRouteContext } from "../../../../../_lib/route-context";
import { revokeNeonUserSession } from "@/lib/auth/server";

export async function POST(_request: Request, context: AdminUserSessionRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.REVOKE_USER_SESSION)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId, sessionId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ message: "sessionId is required" }, { status: 400 });
  }

  const response = await revokeNeonUserSession({ userId, sessionId });
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_session_revoked", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.REVOKE_USER_SESSION, {
      targetUserId: userId,
      targetSessionId: sessionId,
    }),
  });

  return NextResponse.json({ ok: true });
}
