import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listRecentAuthIncidents } from "@/features/auth/server/incident/auth-incident.service";

export async function GET() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const incidents = await listRecentAuthIncidents(100);
  return NextResponse.json({ incidents });
}
