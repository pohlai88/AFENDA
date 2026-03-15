import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../../../../_lib/authorization";
import type { AdminUserRouteContext } from "../../../../_lib/route-context";
import { revokeAllNeonUserSessions } from "@/lib/auth/server";

export async function POST(_request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.REVOKE_USER_SESSIONS)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  const response = await revokeAllNeonUserSessions({ userId });
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_sessions_revoked", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.REVOKE_USER_SESSIONS, {
      targetUserId: userId,
    }),
  });

  return NextResponse.json({ ok: true });
}
