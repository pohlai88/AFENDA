import { publishAuthAuditEvent } from "../audit/audit.helpers";
import { purgeExpiredAuthChallenges } from "../challenge/auth-challenge.service";
import { AuthOpsRepository } from "./auth-ops.repository";
import type { RevokeChallengeInput } from "./auth-ops.types";

const repository = new AuthOpsRepository();

export async function getRecentSecurityChallenges(limit = 100) {
  return repository.listRecentChallenges(limit);
}

export async function getActiveSecurityChallenges(limit = 100) {
  return repository.listActiveChallenges(limit);
}

export async function getRecentSecurityAuditEvents(limit = 100) {
  return repository.listRecentAuditEvents(limit);
}

export async function revokeSecurityChallenge(
  input: RevokeChallengeInput,
): Promise<boolean> {
  const ok = await repository.revokeChallenge(input);

  if (ok) {
    await publishAuthAuditEvent("auth.ops.challenge_revoked", {
      userId: input.actorUserId,
      metadata: {
        challengeId: input.challengeId ?? null,
        reason: input.reason,
      },
    });
  }

  return ok;
}

export async function purgeExpiredChallengesWithAudit(
  actorUserId: string,
): Promise<number> {
  const purged = await purgeExpiredAuthChallenges();

  if (purged > 0) {
    await publishAuthAuditEvent("auth.ops.challenges_purged", {
      userId: actorUserId,
      metadata: { purged },
    });
  }

  return purged;
}
