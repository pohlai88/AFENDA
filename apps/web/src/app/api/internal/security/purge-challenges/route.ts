import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { purgeExpiredChallengesWithAudit } from "@/features/auth/server/ops/auth-ops.service";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const purged = await purgeExpiredChallengesWithAudit(session.user.id);

  await publishAuthAuditEvent("auth.ops.challenges_purged", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      purged,
    },
  });

  return NextResponse.json({
    ok: true,
    purged,
  });
}
