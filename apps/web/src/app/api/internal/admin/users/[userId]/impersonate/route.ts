import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../../../_lib/authorization";
import type { AdminUserRouteContext } from "../../../_lib/route-context";
import { impersonateNeonUser } from "@/lib/auth/server";

export async function POST(_request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.START_IMPERSONATION)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ message: "You cannot impersonate your own user." }, { status: 400 });
  }

  const response = await impersonateNeonUser({ userId });
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_impersonation_started", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.START_IMPERSONATION, {
      targetUserId: userId,
    }),
  });

  return NextResponse.json({
    ok: true,
    result: response.data,
  });
}
