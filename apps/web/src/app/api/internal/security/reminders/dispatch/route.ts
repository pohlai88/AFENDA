import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { dispatchReviewReminders } from "@/features/auth/server/execution/reminder.service";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles?.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await dispatchReviewReminders();

  await publishAuthAuditEvent("auth.ops.review_reminders_dispatched", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      result,
    },
  });

  return NextResponse.json(result);
}
