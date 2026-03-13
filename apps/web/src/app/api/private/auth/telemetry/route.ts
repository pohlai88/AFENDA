import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";

interface TelemetryPayload {
  metric?: unknown;
  details?: unknown;
}

async function safePublish(payload: Parameters<typeof publishAuthAuditEvent>[1]) {
  try {
    await publishAuthAuditEvent("auth.signin.failure", payload);
  } catch {
    // Best-effort telemetry only.
  }
}

export const POST = auth(async function POST(req) {
  if (!req.auth?.user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  let body: TelemetryPayload;
  try {
    body = (await req.json()) as TelemetryPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const metric = typeof body.metric === "string" ? body.metric : undefined;
  if (!metric) {
    return NextResponse.json({ message: "metric is required." }, { status: 400 });
  }

  await safePublish({
    email: req.auth.user.email,
    userId: req.auth.user.id,
    portal: "app",
    errorCode: metric.toUpperCase(),
    metadata: {
      metric,
      details: typeof body.details === "object" && body.details !== null ? body.details : undefined,
    },
  });

  return NextResponse.json({ ok: true });
});
