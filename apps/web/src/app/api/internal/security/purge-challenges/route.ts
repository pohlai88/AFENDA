import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { purgeExpiredChallengesWithAudit } from "@/features/auth/server/ops/auth-ops.service";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const purged = await purgeExpiredChallengesWithAudit(session.user.id);

  return NextResponse.json({
    ok: true,
    purged,
  });
}
