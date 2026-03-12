/**
 * Neon Auth webhook signature verification (EdDSA Ed25519, detached JWS).
 * Ref: docs/neon.webhook.md — Signature verification
 */

import crypto from "node:crypto";

const TIMESTAMP_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export interface VerifyWebhookResult {
  ok: true;
  payload: NeonAuthWebhookPayload;
}

export interface VerifyWebhookError {
  ok: false;
  status: number;
  message: string;
}

export type NeonAuthWebhookEventType =
  | "send.otp"
  | "send.magic_link"
  | "user.before_create"
  | "user.created";

export interface NeonAuthWebhookPayload {
  event_id: string;
  event_type: NeonAuthWebhookEventType;
  timestamp: string;
  context?: { endpoint_id?: string; project_name?: string };
  user?: {
    id?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
    created_at?: string;
    [key: string]: unknown;
  };
  event_data?: Record<string, unknown>;
}

let jwksCache: { keys: Array<{ kid?: string; [key: string]: unknown }> } | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_MS = 60_000; // 1 minute

function getHeadersMap(headers: Headers | Record<string, string | undefined>): Record<string, string> {
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }
  return Object.fromEntries(
    Object.entries(headers).filter(([, v]) => v != null).map(([k, v]) => [k.toLowerCase(), v!]),
  );
}

/**
 * Verify Neon Auth webhook request: EdDSA signature, timestamp freshness, return parsed payload.
 */
export async function verifyNeonAuthWebhook(
  rawBody: string,
  headers: Headers | Record<string, string | undefined>,
  options?: { neonAuthBaseUrl?: string; maxTimestampAgeMs?: number },
): Promise<VerifyWebhookResult | VerifyWebhookError> {
  const h = getHeadersMap(headers);
  const signature = h["x-neon-signature"];
  const kid = h["x-neon-signature-kid"];
  const timestamp = h["x-neon-timestamp"];

  if (!signature || !kid || !timestamp) {
    return { ok: false, status: 400, message: "Missing X-Neon-Signature, X-Neon-Signature-Kid, or X-Neon-Timestamp" };
  }

  const baseUrl = (options?.neonAuthBaseUrl ?? process.env.NEON_AUTH_BASE_URL)?.replace(/\/+$/, "") ?? "";
  if (!baseUrl) {
    return { ok: false, status: 503, message: "NEON_AUTH_BASE_URL not configured" };
  }

  const jwksUrl = `${baseUrl}/.well-known/jwks.json`;

  // 1. Fetch JWKS (with simple cache)
  const now = Date.now();
  if (!jwksCache || now - jwksCacheTime > JWKS_CACHE_MS) {
    try {
      const res = await fetch(jwksUrl);
      if (!res.ok) {
        return { ok: false, status: 502, message: `JWKS fetch failed: ${res.status}` };
      }
      jwksCache = (await res.json()) as { keys: Array<{ kid?: string }> };
      jwksCacheTime = now;
    } catch (err) {
      return {
        ok: false,
        status: 502,
        message: `JWKS fetch error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const jwk = jwksCache.keys.find((k) => k.kid === kid);
  if (!jwk) {
    jwksCache = null;
    return { ok: false, status: 401, message: `Key ${kid} not found in JWKS` };
  }

  // 2. Import Ed25519 public key (JWK from JWKS)
  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey({ key: jwk as object, format: "jwk" });
  } catch (err) {
    return { ok: false, status: 500, message: `Invalid JWK: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 3. Parse detached JWS (header..signature)
  const parts = signature.split(".");
  if (parts.length !== 3 || parts[1] !== "") {
    return { ok: false, status: 400, message: "Expected detached JWS format (header..signature)" };
  }
  const headerB64 = parts[0];
  const signatureB64 = parts[2];
  if (!headerB64 || !signatureB64) {
    return { ok: false, status: 400, message: "Invalid detached JWS structure" };
  }

  // 4. Reconstruct signing input (double base64url per Neon docs)
  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signaturePayload = `${timestamp}.${payloadB64}`;
  const signaturePayloadB64 = Buffer.from(signaturePayload, "utf8").toString("base64url");
  const signingInput = `${headerB64}.${signaturePayloadB64}`;

  // 5. Verify Ed25519
  const isValid = crypto.verify(
    null,
    Buffer.from(signingInput, "utf8"),
    publicKey,
    Buffer.from(signatureB64, "base64url"),
  );
  if (!isValid) {
    return { ok: false, status: 401, message: "Invalid webhook signature" };
  }

  // 6. Timestamp freshness
  const maxAge = options?.maxTimestampAgeMs ?? TIMESTAMP_MAX_AGE_MS;
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > maxAge) {
    return { ok: false, status: 400, message: "Webhook timestamp too old or invalid" };
  }

  let payload: NeonAuthWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as NeonAuthWebhookPayload;
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }

  if (!payload.event_id || !payload.event_type) {
    return { ok: false, status: 400, message: "Missing event_id or event_type" };
  }

  return { ok: true, payload };
}
