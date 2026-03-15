import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
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

  await publishAuthAuditEvent("auth.ops.evidence_export_created", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      exportId: result.exportRecord.id,
      exportType: body.exportType,
      framework: body.framework,
      jurisdiction: body.jurisdiction,
    },
  });

  return NextResponse.json({
    ok: true,
    exportRecord: result.exportRecord,
    payload: result.payload,
  });
}
