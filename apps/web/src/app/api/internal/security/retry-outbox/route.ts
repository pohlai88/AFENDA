import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  retryFailedOutboxEvent,
} from "@/features/auth/server/audit/audit-ops.service";

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

  const eventId =
    typeof body.eventId === "string" ? body.eventId : undefined;
  if (!eventId) {
    return NextResponse.json(
      { message: "eventId is required" },
      { status: 400 },
    );
  }

  const ok = await retryFailedOutboxEvent(eventId, session.user.id);

  await publishAuthAuditEvent("auth.ops.outbox_retry", {
    userId: session.user.id,
    email: session.user.email,
    metadata: {
      eventId,
      ok,
    },
  });

  return NextResponse.json({ ok });
}
