import { getAfendaAuthService } from "../afenda-auth.service";
import { mapVerifyMfaResultToUser } from "../auth-user.mapper";
import type { AfendaAuthenticatedUser } from "../afenda-auth.types";

export interface VerifyMfaChallengeResult {
  user: AfendaAuthenticatedUser | null;
  sessionGrant: string | null;
}

export async function verifyMfaChallenge(input: {
  mfaToken: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<VerifyMfaChallengeResult> {
  const service = getAfendaAuthService();
  const result = await service.verifyMfaChallenge(input);

  return {
    user: mapVerifyMfaResultToUser(result, "app"),
    sessionGrant: result.ok ? result.data.sessionGrant : null,
  };
}
