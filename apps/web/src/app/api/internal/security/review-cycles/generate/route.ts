import { NextResponse } from "next/server";

import { auth } from "@/auth";
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

  return NextResponse.json({ ok: true, reviewCycles: rows });
}
