import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createSignedAuthEvidenceExport } from "@/features/auth/server/compliance/compliance.service";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const result = await createSignedAuthEvidenceExport({
    exportType: body.exportType,
    framework: body.framework,
    jurisdiction: body.jurisdiction,
    createdBy: session.user.id,
    payload: body.payload,
  });

  return NextResponse.json({
    ok: true,
    exportRecord: result.exportRecord,
    payload: result.payload,
  });
}
