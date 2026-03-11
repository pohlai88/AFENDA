import { createHmac } from "crypto";

function getChallengeSecret(): string {
  const secret = process.env.AUTH_CHALLENGE_SECRET;
  if (!secret) {
    throw new Error("AUTH_CHALLENGE_SECRET is required.");
  }
  return secret;
}

export function hashChallengeToken(rawToken: string): string {
  return createHmac("sha256", getChallengeSecret())
    .update(rawToken)
    .digest("hex");
}

export function buildChallengeTokenHint(rawToken: string): string {
  const normalized = rawToken.trim();
  return normalized.length <= 8
    ? normalized.slice(0, 2)
    : `${normalized.slice(0, 4)}…${normalized.slice(-2)}`;
}
