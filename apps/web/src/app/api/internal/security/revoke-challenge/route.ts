import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { revokeSecurityChallenge } from "@/features/auth/server/ops/auth-ops.service";

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

  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId : undefined;
  const rawToken =
    typeof body.rawToken === "string" ? body.rawToken : undefined;

  if (!challengeId && !rawToken) {
    return NextResponse.json(
      { message: "Either challengeId or rawToken is required" },
      { status: 400 },
    );
  }

  const ok = await revokeSecurityChallenge({
    challengeId,
    rawToken,
    reason:
      typeof body.reason === "string" ? body.reason : "manual_review",
    actorUserId: session.user.id,
  });

  await publishAuthAuditEvent("auth.ops.challenge_revoked", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      challengeId: challengeId ?? null,
      reason: typeof body.reason === "string" ? body.reason : "manual_review",
      target: rawToken ? "rawToken" : "challengeId",
      ok,
    },
  });

  return NextResponse.json({ ok });
}
