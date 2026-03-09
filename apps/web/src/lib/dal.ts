/**
 * Data Access Layer — centralizes auth and session verification.
 *
 * Next.js best practice: use verifySession() in Server Components,
 * Server Actions, and Route Handlers for secure checks.
 * Do NOT rely on layout-level auth (Partial Rendering).
 */
import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export const verifySession = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return { isAuth: true, user: session.user };
});
