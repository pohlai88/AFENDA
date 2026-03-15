import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { scheduleQuarterlyAuthReviews } from "@/features/auth/server/execution/review-scheduler.service";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles?.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const rows = await scheduleQuarterlyAuthReviews({
    frameworks: ["SOX", "ISO27001"],
    ownerUserId: session.user.id,
    reviewerUserId: session.user.id,
    approverUserId: session.user.id,
  });

  await publishAuthAuditEvent("auth.ops.review_cycles_generated", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      frameworks: ["SOX", "ISO27001"],
      generatedCount: rows.length,
    },
  });

  return NextResponse.json({ ok: true, reviewCycles: rows });
}
