/**
 * Next.js instrumentation — runs at server startup.
 * Validates auth secrets so we fail fast instead of silently breaking at runtime.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.AUTH_SECRET?.trim()) {
    missing.push("AUTH_SECRET");
  }
  if (!process.env.AUTH_CHALLENGE_SECRET?.trim()) {
    missing.push("AUTH_CHALLENGE_SECRET");
  }
  if (!process.env.AUTH_EVIDENCE_SIGNING_SECRET?.trim()) {
    missing.push("AUTH_EVIDENCE_SIGNING_SECRET");
  }

  if (missing.length > 0) {
    throw new Error(
      `[instrumentation] Auth secrets required in production. Missing: ${missing.join(", ")}. ` +
        "Add to .env or deployment secrets. See docs/production-readiness.md",
    );
  }
}
