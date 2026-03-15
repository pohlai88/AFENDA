import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { assignAuthIncident } from "@/features/auth/server/incident/auth-incident.service";

interface RouteContext {
  params: Promise<{ incidentId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await context.params;
  const body = await request.json();
  const assigneeUserId =
    typeof body.assigneeUserId === "string" ? body.assigneeUserId : undefined;

  const ok = await assignAuthIncident({
    incidentId,
    actorUserId: session.user.id,
    assigneeUserId,
  });

  await publishAuthAuditEvent("auth.ops.incident_assigned", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      incidentId,
      assigneeUserId: assigneeUserId ?? null,
      ok,
    },
  });

  return NextResponse.json({ ok });
}
