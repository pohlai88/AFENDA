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
import { setNeonUserPassword } from "@/lib/auth/server";

export async function POST(request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.SET_USER_PASSWORD)) {
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

  const newPassword = parseTrimmedString(body.newPassword);
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { message: "newPassword must be at least 8 characters." },
      { status: 400 },
    );
  }

  const response = await setNeonUserPassword({
    userId,
    newPassword,
  });

  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_password_set", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.SET_USER_PASSWORD, {
      targetUserId: userId,
      passwordLength: newPassword.length,
    }),
  });

  return NextResponse.json({ ok: true });
}
