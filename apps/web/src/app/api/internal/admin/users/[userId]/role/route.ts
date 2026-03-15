import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../../../_lib/authorization";
import type { AdminUserRouteContext } from "../../../_lib/route-context";
import { parseTrimmedString } from "../../../_lib/parse";
import { setNeonUserRole } from "@/lib/auth/server";

export async function POST(request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.SET_USER_ROLE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const role = parseTrimmedString(body.role);
  if (!role) {
    return NextResponse.json({ message: "role is required" }, { status: 400 });
  }

  const response = await setNeonUserRole({ userId, role });
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_role_set", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.SET_USER_ROLE, {
      targetUserId: userId,
      role,
    }),
  });

  return NextResponse.json({ ok: true });
}
