import { NextResponse } from "next/server";

import { auth } from "@/auth";
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

  const ok = await assignAuthIncident({
    incidentId,
    actorUserId: session.user.id,
    assigneeUserId: body.assigneeUserId,
  });

  return NextResponse.json({ ok });
}
