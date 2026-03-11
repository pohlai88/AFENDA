import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { archiveOrDeleteOldAuthAuditEvents } from "@/features/auth/server/audit/audit.retention";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const deleted = await archiveOrDeleteOldAuthAuditEvents(90);

  return NextResponse.json({
    ok: true,
    deleted,
  });
}
