import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { recordChainOfCustodyEvent } from "@/features/auth/server/compliance/chain-of-custody.service";
import { createReviewAttestation } from "@/features/auth/server/compliance/review-attestation.service";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const row = await createReviewAttestation({
    reviewType: body.reviewType,
    framework: body.framework,
    relatedEntityType: body.relatedEntityType,
    relatedEntityId: body.relatedEntityId,
    attestedBy: session.user.id,
    statement: body.statement,
    outcome: body.outcome,
    metadata: body.metadata,
  });

  if (!row) {
    return NextResponse.json(
      { message: "Attestation insert failed" },
      { status: 500 },
    );
  }

  await recordChainOfCustodyEvent({
    evidenceType: "auth_review_attestation",
    evidenceId: row.id,
    action: "attested",
    actorUserId: session.user.id,
    metadata: {
      framework: body.framework,
      outcome: body.outcome,
    },
  });

  return NextResponse.json({ ok: true, attestation: row });
}
