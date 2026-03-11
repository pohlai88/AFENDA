/**
 * establishWebSessionFromGrant — standardized session creation after auth flow completion.
 *
 * Uses session grant from API (invite acceptance, MFA verification) instead of
 * replaying credentials. Cleaner and more secure.
 */

import { signIn } from "@/auth";

export interface EstablishSessionInput {
  /** One-time session grant from API (invite accept or MFA verify). */
  grant: string;
  /** Where to redirect after session is created. */
  redirectTo?: string;
}

/**
 * Establish web session from a one-time session grant.
 * Calls signIn("afenda-grant", { grant, redirectTo }).
 */
export async function establishWebSessionFromGrant(
  input: EstablishSessionInput,
): Promise<void> {
  await signIn("afenda-grant", {
    grant: input.grant,
    redirectTo: input.redirectTo ?? "/app",
  });
}
