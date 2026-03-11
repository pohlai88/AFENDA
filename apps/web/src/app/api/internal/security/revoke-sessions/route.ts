import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { revokeUserSessions } from "@/features/auth/server/session-control/auth-session-control.service";

const RevokeSessionsBodySchema = z
  .object({
    targetUserId: z.string().uuid().optional(),
    tenantId: z.string().uuid().optional(),
    portal: z.string().optional(),
    reason: z.string().max(64).optional(),
  })
  .refine((data) => data.targetUserId ?? data.tenantId ?? data.portal, {
    message: "At least one of targetUserId, tenantId, or portal is required",
  });

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof RevokeSessionsBodySchema>;
  try {
    const raw = await request.json();
    body = RevokeSessionsBodySchema.parse(raw);
  } catch {
    return NextResponse.json(
      { message: "Invalid request body", code: "SHARED_VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  await revokeUserSessions({
    actorUserId: session.user.id,
    targetUserId: body.targetUserId,
    tenantId: body.tenantId,
    portal: body.portal,
    reason: body.reason ?? "manual_security_action",
  });

  return NextResponse.json({ ok: true });
}
