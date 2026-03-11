/**
 * Auth challenge token hashing — matches web app's auth-challenge.crypto.
 *
 * Must use the same algorithm and secret so API and web can resolve
 * challenge tokens consistently.
 */
import { createHmac } from "node:crypto";

function getChallengeSecret(): string {
  const secret = process.env.AUTH_CHALLENGE_SECRET;
  if (!secret) {
    throw new Error("AUTH_CHALLENGE_SECRET is required for auth challenge operations");
  }
  return secret;
}

export function hashChallengeToken(rawToken: string): string {
  return createHmac("sha256", getChallengeSecret())
    .update(rawToken)
    .digest("hex");
}
