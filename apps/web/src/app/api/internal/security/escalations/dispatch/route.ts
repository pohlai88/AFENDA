import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { dispatchOverdueEscalations } from "@/features/auth/server/execution/escalation.service";

export async function POST() {
  const session = await auth();

  if (!session?.user || !session.user.roles?.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await dispatchOverdueEscalations();

  await publishAuthAuditEvent("auth.ops.escalations_dispatched", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      result,
    },
  });

  return NextResponse.json(result);
}
