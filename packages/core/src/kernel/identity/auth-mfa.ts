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
import { createLogger } from "../infrastructure/logger";

const IAM_MFA_INVALID = "IAM_MFA_INVALID" as const;
const TOTP_ALGORITHM = "sha1" as const;
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_EPOCH_TOLERANCE = 1;
const TOTP_ISSUER = "AFENDA";
const log = createLogger("auth-mfa");

export type CreateMfaChallengeResult = { mfaToken: string };

export type VerifyMfaChallengeResult =
  | { ok: true; principalId: string; email: string; portal: string; sessionGrant: string }
  | { ok: false; error: string };

function createToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create an MFA challenge in authChallenges for a principal that has TOTP enrolled.
 * The returned mfaToken must be sent to the client and then POST-ed to /auth/verify-mfa-challenge.
 * Expires in 5 minutes; maxAttempts = 5.
 */
export async function createMfaChallenge(
  db: DbClient,
  input: { principalId: string; email: string; portal: string },
): Promise<CreateMfaChallengeResult> {
  const token = createToken();
  const tokenHash = hashChallengeToken(token);
  const tokenHashPrefix = tokenHash.slice(0, 8);

  await db.insert(authChallenges).values({
    type: "mfa",
    tokenHash,
    email: input.email,
    portal: input.portal,
    userId: input.principalId,
    maxAttempts: 5,
    expiresAt: sql`now() + interval '5 minutes'`,
  });

  log.info(
    { tokenHashPrefix, principalId: input.principalId, portal: input.portal },
    "MFA challenge created",
  );

  return { mfaToken: token };
}

export async function verifyMfaChallenge(
  db: DbClient,
  input: { mfaToken: string; code: string },
): Promise<VerifyMfaChallengeResult> {
  const tokenHash = hashChallengeToken(input.mfaToken);
  const tokenHashPrefix = tokenHash.slice(0, 8);

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
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge?.id,
        challengeType: challenge?.type,
      },
      "MFA challenge rejected: missing challenge or type mismatch",
    );
    return { ok: false, error: IAM_MFA_INVALID };
  }

  if (challenge.revoked || challenge.consumedAt) {
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge.id,
        principalId: challenge.userId,
        revoked: challenge.revoked,
        consumedAt: challenge.consumedAt,
        portal: challenge.portal,
      },
      "MFA challenge rejected: revoked or already consumed",
    );
    return { ok: false, error: IAM_MFA_INVALID };
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge.id,
        principalId: challenge.userId,
        expiresAt: challenge.expiresAt,
        portal: challenge.portal,
      },
      "MFA challenge rejected: expired",
    );
    return { ok: false, error: IAM_MFA_INVALID };
  }

  if (challenge.attemptCount >= challenge.maxAttempts) {
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge.id,
        principalId: challenge.userId,
        attemptCount: challenge.attemptCount,
        maxAttempts: challenge.maxAttempts,
        expiresAt: challenge.expiresAt,
        portal: challenge.portal,
      },
      "MFA challenge rejected: max attempts reached",
    );
    return { ok: false, error: IAM_MFA_INVALID };
  }

  const principalId = challenge.userId;
  if (!principalId) {
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge.id,
        attemptCount: challenge.attemptCount,
        maxAttempts: challenge.maxAttempts,
        expiresAt: challenge.expiresAt,
        portal: challenge.portal,
      },
      "MFA challenge rejected: missing principal id",
    );
    return { ok: false, error: IAM_MFA_INVALID };
  }

  const [mfaRow] = await db
    .select({ totpSecret: iamPrincipalMfa.totpSecret })
    .from(iamPrincipalMfa)
    .where(eq(iamPrincipalMfa.principalId, principalId))
    .limit(1);

  if (!mfaRow?.totpSecret) {
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge.id,
        principalId,
        attemptCount: challenge.attemptCount,
        maxAttempts: challenge.maxAttempts,
        expiresAt: challenge.expiresAt,
        portal: challenge.portal,
      },
      "MFA challenge rejected: principal enrollment missing",
    );
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
    epochTolerance: 1,
  });

  if (!valid.valid) {
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge.id,
        principalId,
        attemptCount: challenge.attemptCount,
        maxAttempts: challenge.maxAttempts,
        expiresAt: challenge.expiresAt,
        portal: challenge.portal,
        codeLength: input.code.length,
        verifyResultType: typeof valid,
        verifyValid: typeof valid === "object" && valid ? valid.valid : null,
      },
      "MFA challenge rejected: invalid code",
    );
    return { ok: false, error: IAM_MFA_INVALID };
  }

  const [principal] = await db
    .select({ email: iamPrincipal.email })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.id, principalId))
    .limit(1);

  if (!principal?.email) {
    log.warn(
      {
        tokenHashPrefix,
        challengeId: challenge.id,
        principalId,
        attemptCount: challenge.attemptCount,
        maxAttempts: challenge.maxAttempts,
        expiresAt: challenge.expiresAt,
        portal: challenge.portal,
      },
      "MFA challenge rejected: principal email missing",
    );
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

  log.info(
    {
      tokenHashPrefix,
      challengeId: challenge.id,
      principalId,
      attemptCount: challenge.attemptCount,
      maxAttempts: challenge.maxAttempts,
      expiresAt: challenge.expiresAt,
      portal,
    },
    "MFA challenge verified and session grant issued",
  );

  return {
    ok: true,
    principalId,
    email: principal.email,
    portal,
    sessionGrant: grant,
  };
}

// ── MFA enrollment ────────────────────────────────────────────────────────────

export type GenerateMfaEnrollmentResult =
  | { ok: true; secret: string; otpauthUri: string }
  | { ok: false; error: string };

/**
 * Generate a new TOTP secret for enrollment.
 * Looks up the principal's email from the DB (used as the authenticator app account label).
 * Returns the base32-encoded secret and the otpauth:// URI suitable for QR display.
 * Does NOT persist anything — caller must confirm with confirmMfaEnrollment().
 */
export async function generateMfaEnrollment(
  db: DbClient,
  input: { principalId: string },
): Promise<GenerateMfaEnrollmentResult> {
  const [principal] = await db
    .select({ email: iamPrincipal.email })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.id, input.principalId))
    .limit(1);

  if (!principal?.email) {
    return { ok: false, error: "IAM_PRINCIPAL_NOT_FOUND" };
  }

  const rawBytes = randomBytes(20); // 160-bit TOTP secret (RFC 6238 recommendation)
  const base32 = new ScureBase32Plugin();
  const secret = base32.encode(new Uint8Array(rawBytes) as unknown as Uint8Array<ArrayBufferLike>);

  const label = encodeURIComponent(`${TOTP_ISSUER}:${principal.email}`);
  const otpauthUri =
    `otpauth://totp/${label}` +
    `?secret=${secret}` +
    `&issuer=${encodeURIComponent(TOTP_ISSUER)}` +
    `&algorithm=SHA1` +
    `&digits=${TOTP_DIGITS}` +
    `&period=${TOTP_PERIOD}`;

  return { ok: true, secret, otpauthUri };
}

export type ConfirmMfaEnrollmentResult = { ok: true } | { ok: false; error: string };

/**
 * Verify that the user's authenticator app produces a valid code for the given secret,
 * then upsert the secret into iamPrincipalMfa (enabling MFA for this principal).
 */
export async function confirmMfaEnrollment(
  db: DbClient,
  input: { principalId: string; secret: string; code: string },
): Promise<ConfirmMfaEnrollmentResult> {
  const valid = await verify({
    secret: input.secret,
    token: input.code,
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    epochTolerance: TOTP_EPOCH_TOLERANCE,
  });

  if (!valid.valid) {
    log.warn({ principalId: input.principalId }, "MFA enrollment rejected: invalid trial code");
    return { ok: false, error: IAM_MFA_INVALID };
  }

  await db
    .insert(iamPrincipalMfa)
    .values({
      principalId: input.principalId,
      totpSecret: input.secret,
    })
    .onConflictDoUpdate({
      target: iamPrincipalMfa.principalId,
      set: {
        totpSecret: input.secret,
        updatedAt: sql`now()`,
      },
    });

  log.info({ principalId: input.principalId }, "MFA enrollment confirmed");
  return { ok: true };
}

/**
 * Check whether MFA is currently enrolled for a principal.
 */
export async function getMfaStatus(
  db: DbClient,
  principalId: string,
): Promise<{ enabled: boolean }> {
  const [row] = await db
    .select({ id: iamPrincipalMfa.id })
    .from(iamPrincipalMfa)
    .where(eq(iamPrincipalMfa.principalId, principalId))
    .limit(1);

  return { enabled: !!row };
}

/**
 * Remove TOTP enrollment for a principal, effectively disabling MFA.
 */
export async function disableMfaEnrollment(
  db: DbClient,
  principalId: string,
): Promise<{ ok: true }> {
  await db.delete(iamPrincipalMfa).where(eq(iamPrincipalMfa.principalId, principalId));
  log.info({ principalId }, "MFA enrollment disabled");
  return { ok: true };
}
