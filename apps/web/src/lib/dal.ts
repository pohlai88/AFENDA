/**
 * Data Access Layer — centralizes auth and session verification.
 *
 * TODO: Re-implement when new auth architecture is scaffolded.
 * Next.js best practice: use verifySession() in Server Components,
 * Server Actions, and Route Handlers for secure checks.
 */
import "server-only";

import { cache } from "react";

export const verifySession = cache(async () => {
  // TODO: Replace with new auth implementation
  return null;
});
