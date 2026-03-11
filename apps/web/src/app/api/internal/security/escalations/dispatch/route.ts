import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { dispatchOverdueEscalations } from "@/features/auth/server/execution/escalation.service";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles?.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await dispatchOverdueEscalations();
  return NextResponse.json(result);
}
