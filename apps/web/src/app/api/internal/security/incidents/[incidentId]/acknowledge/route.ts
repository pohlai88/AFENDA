import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { acknowledgeAuthIncident } from "@/features/auth/server/incident/auth-incident.service";

interface RouteContext {
  params: Promise<{ incidentId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await context.params;

  const ok = await acknowledgeAuthIncident({
    incidentId,
    actorUserId: session.user.id,
  });

  await publishAuthAuditEvent("auth.ops.incident_acknowledged", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      incidentId,
      ok,
    },
  });

  return NextResponse.json({ ok });
}
