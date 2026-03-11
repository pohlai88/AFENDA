import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  forceDeadLetterOutboxEvent,
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

  const reason =
    typeof body.reason === "string" ? body.reason : undefined;

  const ok = await forceDeadLetterOutboxEvent(
    eventId,
    session.user.id,
    reason,
  );
  return NextResponse.json({ ok });
}
