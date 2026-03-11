import { getAfendaAuthService } from "../afenda-auth.service";
import { mapVerifyMfaResultToUser } from "../auth-user.mapper";
import type { AfendaAuthenticatedUser } from "../afenda-auth.types";

export interface VerifyMfaChallengeResult {
  user: AfendaAuthenticatedUser | null;
  sessionGrant?: string;
}

export async function verifyMfaChallenge(input: {
  mfaToken: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<VerifyMfaChallengeResult> {
  const service = getAfendaAuthService();
  const result = await service.verifyMfaChallenge(input);

  const user = mapVerifyMfaResultToUser(result, "app");
  return {
    user,
    sessionGrant: result.ok ? result.data.sessionGrant : undefined,
  };
}
