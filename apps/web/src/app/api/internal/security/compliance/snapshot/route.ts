import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { runAuthControlChecks } from "@/features/auth/server/compliance/control-checks.service";

export async function GET() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const controlRuns = await runAuthControlChecks();
  return NextResponse.json({ controlRuns });
}
