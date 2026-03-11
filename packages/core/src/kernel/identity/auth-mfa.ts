/**
 * MFA verification and enrollment — verify TOTP code, enroll principal.
 */

import { eq, sql } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import { authChallenges, authSessionGrant, iamPrincipal, iamPrincipalMfa } from "@afenda/db";
import { IAM_MFA_NOT_IMPLEMENTED } from "@afenda/contracts";

import { verify, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { createHash, randomBytes } from "node:crypto";
import { hashChallengeToken } from "./auth-challenge-hash";

const IAM_MFA_INVALID = "IAM_MFA_INVALID" as const;

export type VerifyMfaChallengeResult =
  | { ok: true; principalId: string; email: string; portal: string; sessionGrant: string }
  | { ok: false; error: string };

function createToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyMfaChallenge(
  db: DbClient,
  input: { mfaToken: string; code: string },
): Promise<VerifyMfaChallengeResult> {
  const tokenHash = hashChallengeToken(input.mfaToken);

  const [challenge] = await db
    .select({
      id: authChallenges.id,
      type: authChallenges.type,
      userId: authChallenges.userId,
      email: authChallenges.email,
      portal: authChallenges.portal,
      tenantId: authChallenges.tenantId,
      tenantSlug: authChallenges.tenantSlug,
      revoked: authChallenges.revoked,
      consumedAt: authChallenges.consumedAt,
      attemptCount: authChallenges.attemptCount,
      maxAttempts: authChallenges.maxAttempts,
      expiresAt: authChallenges.expiresAt,
    })
    .from(authChallenges)
    .where(eq(authChallenges.tokenHash, tokenHash))
    .limit(1);

  if (!challenge || challenge.type !== "mfa") {
    return { ok: false, error: IAM_MFA_INVALID };
  }

  if (challenge.revoked || challenge.consumedAt) {
    return { ok: false, error: IAM_MFA_INVALID };
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: IAM_MFA_INVALID };
  }

  if (challenge.attemptCount >= challenge.maxAttempts) {
    return { ok: false, error: IAM_MFA_INVALID };
  }

  const principalId = challenge.userId;
  if (!principalId) {
    return { ok: false, error: IAM_MFA_INVALID };
  }

  const [mfaRow] = await db
    .select({ totpSecret: iamPrincipalMfa.totpSecret })
    .from(iamPrincipalMfa)
    .where(eq(iamPrincipalMfa.principalId, principalId))
    .limit(1);

  if (!mfaRow?.totpSecret) {
    return { ok: false, error: IAM_MFA_NOT_IMPLEMENTED };
  }

  const valid = await verify({
    secret: mfaRow.totpSecret,
    token: input.code,
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
    algorithm: "sha1" as const,
    digits: 6,
    period: 30,
    epoch: Date.now(),
    epochTolerance: 1,
  });

  if (!valid.valid) {
    return { ok: false, error: IAM_MFA_INVALID };
  }

  const [principal] = await db
    .select({ email: iamPrincipal.email })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.id, principalId))
    .limit(1);

  if (!principal?.email) {
    return { ok: false, error: IAM_MFA_INVALID };
  }

  const grant = createToken();
  const grantHash = hashToken(grant);
  const portal = challenge.portal ?? "app";

  await db.insert(authSessionGrant).values({
    principalId,
    tokenHash: grantHash,
    email: principal.email,
    portal,
    expiresAt: sql`now() + interval '5 minutes'`,
  });

  await db
    .update(authChallenges)
    .set({
      consumedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(authChallenges.id, challenge.id));

  return {
    ok: true,
    principalId,
    email: principal.email,
    portal,
    sessionGrant: grant,
  };
}
