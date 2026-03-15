import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { resolveAuthIncident } from "@/features/auth/server/incident/auth-incident.service";

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
  const resolutionNote =
    typeof body.resolutionNote === "string" ? body.resolutionNote : "";

  const ok = await resolveAuthIncident({
    incidentId,
    actorUserId: session.user.id,
    resolutionNote,
  });

  await publishAuthAuditEvent("auth.ops.incident_resolved", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      incidentId,
      resolutionNoteLength: resolutionNote.length,
      ok,
    },
  });

  return NextResponse.json({ ok });
}
