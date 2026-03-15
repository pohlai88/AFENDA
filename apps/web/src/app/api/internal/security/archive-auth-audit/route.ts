import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { archiveOrDeleteOldAuthAuditEvents } from "@/features/auth/server/audit/audit.retention";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const deleted = await archiveOrDeleteOldAuthAuditEvents(90);

  await publishAuthAuditEvent("auth.ops.auth_audit_archived", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      retentionDays: 90,
      deleted,
    },
  });

  return NextResponse.json({
    ok: true,
    deleted,
  });
}
