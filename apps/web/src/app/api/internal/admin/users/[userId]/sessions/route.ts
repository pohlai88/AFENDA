import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../../../_lib/authorization";
import type { AdminUserRouteContext } from "../../../_lib/route-context";
import { parsePositiveInteger } from "../../../_lib/parse";
import { listNeonAdminUserSessions } from "@/lib/auth/server";

export async function GET(request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.LIST_USER_SESSIONS)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const offset = parsePositiveInteger(url.searchParams.get("offset"), 0);
  const limit = Math.min(100, Math.max(1, parsePositiveInteger(url.searchParams.get("limit"), 25)));

  const response = await listNeonAdminUserSessions({
    userId,
    query: {
      offset,
      limit,
    },
  });

  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_sessions_listed", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.LIST_USER_SESSIONS, {
      targetUserId: userId,
      offset,
      limit,
      total: response.data?.total ?? 0,
    }),
  });

  return NextResponse.json({
    sessions: response.data?.sessions ?? [],
    total: response.data?.total ?? 0,
    pagination: {
      offset,
      limit,
    },
  });
}
