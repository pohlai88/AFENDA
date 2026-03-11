import { createHash, createHmac } from "node:crypto";

function getEvidenceSigningSecret(): string {
  const secret = process.env.AUTH_EVIDENCE_SIGNING_SECRET;
  if (!secret) {
    throw new Error("AUTH_EVIDENCE_SIGNING_SECRET is required.");
  }
  return secret;
}

export function hashEvidencePayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export function signEvidencePayload(payload: string): string {
  return createHmac("sha256", getEvidenceSigningSecret())
    .update(payload)
    .digest("hex");
}
