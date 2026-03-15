import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../../_lib/authorization";
import type { AdminUserRouteContext } from "../../_lib/route-context";
import { getNeonAdminUser, removeNeonUser } from "@/lib/auth/server";

export async function GET(_request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.READ_USER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  const response = await getNeonAdminUser({ userId });
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_read", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.READ_USER, {
      targetUserId: userId,
      found: Boolean(response.data),
    }),
  });

  return NextResponse.json({
    user: response.data,
  });
}

export async function DELETE(_request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.REMOVE_USER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ message: "You cannot remove your own user." }, { status: 400 });
  }

  const response = await removeNeonUser({ userId });
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_removed", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.REMOVE_USER, {
      targetUserId: userId,
    }),
  });

  return NextResponse.json({ ok: true });
}
