"use server";

import { redirect } from "next/navigation";

import { establishWebSessionFromGrant } from "@/features/auth/server/establish-session";
import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import { resolveVerifyRedirect } from "../_lib/auth-redirect";
import type { AuthActionState } from "../_lib/auth-state";
import { verifySchema } from "../_lib/auth-schemas";

import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  consumeAuthChallenge,
  getAuthChallengeByToken,
  isChallengeUsable,
  recordFailedChallengeAttempt,
} from "@/features/auth/server/challenge/auth-challenge.service";
import { verifyMfaChallenge } from "@/features/auth/server/mfa/mfa.service";
import { getAuthSecurityContext } from "@/features/auth/server/security/auth-security-context";

async function safePublishAuthAuditEvent(
  type: Parameters<typeof publishAuthAuditEvent>[0],
  context: Parameters<typeof publishAuthAuditEvent>[1],
): Promise<void> {
  try {
    await publishAuthAuditEvent(type, context);
  } catch {
    // Best-effort audit: auth UX should not fail when audit storage is unavailable.
  }
}

function mapConsumeFailureToMessage(reason?: string): string {
  switch (reason) {
    case "expired":
      return "This verification challenge has expired.";
    case "revoked":
      return "This verification challenge is no longer valid.";
    case "already_consumed":
      return "This verification challenge has already been used.";
    case "max_attempts_exceeded":
      return "Too many invalid verification attempts.";
    default:
      return "This verification challenge is no longer valid.";
  }
}

export async function verifyAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = verifySchema.safeParse({
    code: formData.get("code"),
    callbackUrl: formData.get("callbackUrl"),
    mfaToken: formData.get("mfaToken"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { code, callbackUrl, mfaToken } = parsed.data;
  const security = await getAuthSecurityContext();

  let challenge: Awaited<ReturnType<typeof getAuthChallengeByToken>>;

  try {
    challenge = await getAuthChallengeByToken(mfaToken);
  } catch {
    return buildFailureState("Verification is temporarily unavailable. Please try again.");
  }

  if (!isChallengeUsable(challenge) || challenge?.type !== "mfa") {
    await safePublishAuthAuditEvent("auth.mfa.failure", {
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "INVALID_OR_EXPIRED_CHALLENGE",
    });

    return buildFailureState("This verification challenge is no longer valid.");
  }

  const { user, sessionGrant } = await verifyMfaChallenge({
    mfaToken,
    code,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  if (!user) {
    const failed = await recordFailedChallengeAttempt(mfaToken);

    await safePublishAuthAuditEvent("auth.mfa.failure", {
      email: challenge.email ?? undefined,
      userId: challenge.userId ?? undefined,
      tenantId: challenge.tenantId ?? undefined,
      tenantSlug: challenge.tenantSlug ?? undefined,
      portal: challenge.portal ?? undefined,
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "INVALID_MFA_CODE",
      metadata: {
        attemptCount: failed.challenge?.attemptCount ?? null,
        maxAttempts: failed.challenge?.maxAttempts ?? null,
      },
    });

    if (
      failed.challenge &&
      failed.challenge.attemptCount >= failed.challenge.maxAttempts
    ) {
      return buildFailureState("Too many invalid verification attempts.");
    }

    return buildFailureState("Invalid or expired verification code.");
  }

  const consumeResult = await consumeAuthChallenge(mfaToken, "mfa");

  if (!consumeResult.ok) {
    await safePublishAuthAuditEvent("auth.mfa.failure", {
      email: challenge.email ?? undefined,
      userId: challenge.userId ?? undefined,
      tenantId: challenge.tenantId ?? undefined,
      tenantSlug: challenge.tenantSlug ?? undefined,
      portal: challenge.portal ?? undefined,
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: `CHALLENGE_CONSUME_${consumeResult.reason ?? "FAILED"}`,
    });

    return buildFailureState(mapConsumeFailureToMessage(consumeResult.reason));
  }

  await safePublishAuthAuditEvent("auth.mfa.success", {
    email: user.email,
    userId: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    portal: user.portal,
    callbackUrl,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  const redirectTo = resolveVerifyRedirect(callbackUrl);

  if (sessionGrant) {
    try {
      await establishWebSessionFromGrant({ grant: sessionGrant, redirectTo });
    } catch (error) {
      if (isRedirectError(error)) throw error;
      // Session establishment failed: return success message with redirect
      return {
        ok: true,
        message: "Verification successful. Redirecting...",
        redirectTo,
      };
    }
  }

  redirect(redirectTo);
}

function isRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const e = error as Error & { digest?: string };
  return e.digest === "NEXT_REDIRECT";
}
