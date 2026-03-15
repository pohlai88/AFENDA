import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../../../_lib/authorization";
import type { AdminUserRouteContext } from "../../../_lib/route-context";
import {
  normalizeBanExpiresInSeconds,
  parseFiniteNumber,
  parseTrimmedString,
} from "../../../_lib/parse";
import { banNeonUser, unbanNeonUser } from "@/lib/auth/server";

export async function POST(request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.BAN_USER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ message: "You cannot ban your own user." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const banReason = parseTrimmedString(body.reason);
  const banExpiresIn = normalizeBanExpiresInSeconds(parseFiniteNumber(body.expiresInSeconds));

  if (body.expiresInSeconds !== undefined && banExpiresIn === undefined) {
    return NextResponse.json(
      { message: "expiresInSeconds must be an integer between 60 and 31536000." },
      { status: 400 },
    );
  }

  const response = await banNeonUser({
    userId,
    banReason,
    banExpiresIn,
  });

  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_banned", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.BAN_USER, {
      targetUserId: userId,
      reason: banReason ?? null,
      expiresInSeconds: banExpiresIn ?? null,
    }),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: AdminUserRouteContext) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.UNBAN_USER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  const response = await unbanNeonUser({ userId });
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_unbanned", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.UNBAN_USER, {
      targetUserId: userId,
    }),
  });

  return NextResponse.json({ ok: true });
}
