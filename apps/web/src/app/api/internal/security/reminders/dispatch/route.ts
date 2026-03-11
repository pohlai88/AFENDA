import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { dispatchReviewReminders } from "@/features/auth/server/execution/reminder.service";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles?.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await dispatchReviewReminders();
  return NextResponse.json(result);
}
