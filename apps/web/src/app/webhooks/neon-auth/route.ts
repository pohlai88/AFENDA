/**
 * Neon Auth webhook endpoint.
 * Ref: docs/neon.webhook.md
 *
 * Events: send.otp, send.magic_link, user.before_create, user.created
 * - Verify EdDSA signature via NEON_AUTH_BASE_URL JWKS
 * - Idempotency by X-Neon-Event-Id (critical for user.before_create retries)
 * - user.before_create: return { allowed: true } or { allowed: false, error_message?, error_code? }
 * - send.otp / send.magic_link: return 2xx (Neon handles delivery unless you replace via webhook)
 * - user.created: return 2xx, process async
 */

import { NextResponse } from "next/server";
import { verifyNeonAuthWebhook, type NeonAuthWebhookEventType } from "./verify-webhook";
import { getIdempotentResponse, setIdempotentResponse } from "./idempotency";

export const dynamic = "force-dynamic";
export const maxDuration = 25; // allow time for JWKS fetch + handler (Neon timeout 15s global)

export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  const eventId = request.headers.get("x-neon-event-id") ?? undefined;

  // Idempotency: if we already processed this event_id (e.g. user.before_create retry), return same response
  if (eventId) {
    const cached = getIdempotentResponse(eventId);
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  const result = await verifyNeonAuthWebhook(rawBody, request.headers);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  const { payload } = result;
  const eventType = payload.event_type as NeonAuthWebhookEventType;

  switch (eventType) {
    case "user.before_create": {
      // Allow all signups by default. Override with allowlist/blocklist via event_data or user.
      const allowed = true;
      const body = allowed ? { allowed: true } : { allowed: false, error_message: "Signup not allowed.", error_code: "SIGNUP_DISABLED" };
      if (eventId) setIdempotentResponse(eventId, { status: 200, body });
      return NextResponse.json(body, { status: 200 });
    }
    case "send.otp":
    case "send.magic_link": {
      // Return 200 so Neon does not retry. Default delivery is handled by Neon; for custom delivery, implement here and return 200.
      return new NextResponse(null, { status: 200 });
    }
    case "user.created": {
      // Non-blocking: return 200 immediately. Process in background (e.g. queue job, sync to CRM).
      return new NextResponse(null, { status: 200 });
    }
    default: {
      return NextResponse.json({ error: `Unhandled event_type: ${eventType}` }, { status: 400 });
    }
  }
}
