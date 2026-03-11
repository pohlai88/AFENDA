import {
  AuthChallengeRepository,
  getAuthChallengeRepository,
} from "./auth-challenge.repository";
import type {
  AuthChallengeRecord,
  AuthChallengeType,
  ConsumeChallengeResult,
  CreateAuthChallengeInput,
  FailedAttemptResult,
} from "./auth-challenge.types";

function getRepository(): AuthChallengeRepository {
  const repo = getAuthChallengeRepository();
  if (!repo) {
    throw new Error("DATABASE_URL required for auth challenges");
  }
  return repo;
}

export async function createAuthChallenge(
  input: CreateAuthChallengeInput,
): Promise<AuthChallengeRecord> {
  return getRepository().create(input);
}

export async function getAuthChallengeByToken(
  rawToken: string,
): Promise<AuthChallengeRecord | null> {
  return getRepository().getByRawToken(rawToken);
}

export async function recordFailedChallengeAttempt(
  rawToken: string,
): Promise<FailedAttemptResult> {
  return getRepository().recordFailedAttempt(rawToken);
}

export async function consumeAuthChallenge(
  rawToken: string,
  expectedType?: AuthChallengeType,
): Promise<ConsumeChallengeResult> {
  return getRepository().consumeIfUsable(rawToken, expectedType);
}

export async function revokeAuthChallenge(rawToken: string): Promise<void> {
  await getRepository().revoke(rawToken);
}

export async function purgeExpiredAuthChallenges(): Promise<number> {
  const repo = getAuthChallengeRepository();
  if (!repo) return 0;
  return repo.purgeExpired();
}

export function buildChallengeExpiry(minutes = 10): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function isChallengeUsable(record: AuthChallengeRecord | null): boolean {
  if (!record) return false;
  if (record.revoked) return false;
  if (record.consumedAt) return false;
  if (record.attemptCount >= record.maxAttempts) return false;
  return new Date(record.expiresAt).getTime() > Date.now();
}

export function assertChallengeType(
  record: AuthChallengeRecord | null,
  type: AuthChallengeType,
): boolean {
  return !!record && record.type === type;
}
