import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAuthGovernanceSnapshot } from "@/features/auth/server/governance/auth-governance.service";

export async function GET() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const snapshot = await getAuthGovernanceSnapshot();
  return NextResponse.json(snapshot);
}
