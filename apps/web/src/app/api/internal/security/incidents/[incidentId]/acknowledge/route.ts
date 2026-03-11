import { NextResponse } from "next/server";

import { auth } from "@/auth";
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

  return NextResponse.json({ ok });
}
