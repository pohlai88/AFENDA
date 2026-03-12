/**
 * Debug endpoint: Neon vs AFENDA session state after OAuth.
 *
 * Use after OAuth redirect to see whether the drop-back to sign-in is due to:
 * - No Neon session (cookie not set or wrong domain)
 * - Neon session present but no AFENDA session (principal/org not synced)
 *
 * Only responds when NODE_ENV !== "production" or DEBUG_SESSION=1.
 * GET /api/debug-session
 */

import { NextResponse } from "next/server";

import { auth, getSession } from "@/lib/auth/server";

const allowDebug =
  process.env.NODE_ENV !== "production" || process.env.DEBUG_SESSION === "1";

export async function GET() {
  if (!allowDebug) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let hasNeonSession = false;
  let hasAfendaSession = false;
  let email: string | null = null;
  let neonError: string | null = null;

  if (auth) {
    const neonResult = await auth.getSession();
    if (neonResult.error) {
      neonError = neonResult.error.message ?? String(neonResult.error);
    } else if (neonResult.data?.user && neonResult.data?.session) {
      hasNeonSession = true;
      email = neonResult.data.user.email ?? null;
    }
  }

  const afendaSession = await getSession();
  if (afendaSession?.user) {
    hasAfendaSession = true;
  }

  return NextResponse.json({
    hasNeonSession,
    hasAfendaSession,
    email,
    neonError: neonError ?? undefined,
    hint:
      !hasNeonSession && !hasAfendaSession
        ? "No session: cookie may be missing or set for wrong domain."
        : hasNeonSession && !hasAfendaSession
          ? "Neon session exists but no AFENDA identity (check iam_principal sync for this email)."
          : undefined,
  });
}
