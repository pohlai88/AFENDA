import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { acknowledgeAnomaly } from "@/features/auth/server/ops/anomaly-ack.service";

const VALID_CODES = new Set([
  "high_signin_failure_volume",
  "high_mfa_failure_volume",
  "failed_audit_backlog",
  "expired_challenge_backlog",
]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const anomalyCode =
    typeof body.anomalyCode === "string" ? body.anomalyCode : undefined;
  if (!anomalyCode || !VALID_CODES.has(anomalyCode)) {
    return NextResponse.json(
      {
        message:
          "anomalyCode is required and must be one of: " +
          [...VALID_CODES].join(", "),
      },
      { status: 400 },
    );
  }

  const note =
    typeof body.note === "string" ? body.note : undefined;

  await acknowledgeAnomaly(anomalyCode, session.user.id, note);

  return NextResponse.json({
    ok: true,
    message: "Anomaly acknowledged.",
  });
}
