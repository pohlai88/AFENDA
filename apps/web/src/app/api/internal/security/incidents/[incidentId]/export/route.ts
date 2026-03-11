import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { exportAuthIncidentEvidence } from "@/features/auth/server/incident/auth-incident.export";

interface RouteContext {
  params: Promise<{ incidentId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await context.params;
  const evidence = await exportAuthIncidentEvidence(incidentId);

  if (!evidence) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(evidence);
}
