import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { revokeUserSession } from "@/features/auth/server/ops/session-revocation.service";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const targetUserId =
    typeof body.targetUserId === "string" ? body.targetUserId : undefined;
  if (!targetUserId) {
    return NextResponse.json(
      { message: "targetUserId is required" },
      { status: 400 },
    );
  }

  const reason =
    typeof body.reason === "string" ? body.reason : undefined;

  await revokeUserSession(targetUserId, session.user.id, reason);

  return NextResponse.json({
    ok: true,
    message: "Session revoked. User must sign in again.",
  });
}
