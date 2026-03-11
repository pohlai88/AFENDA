"use server";

import { redirect } from "next/navigation";

import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import type { AuthActionState } from "../_lib/auth-state";
import { resetPasswordSchema } from "../_lib/auth-schemas";

import { getAfendaAuthService } from "@/features/auth/server/afenda-auth.service";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  consumeAuthChallenge,
  getAuthChallengeByToken,
  isChallengeUsable,
  recordFailedChallengeAttempt,
} from "@/features/auth/server/challenge/auth-challenge.service";
import { getAuthSecurityContext } from "@/features/auth/server/security/auth-security-context";

function mapResetConsumeFailureToMessage(reason?: string): string {
  switch (reason) {
    case "expired":
      return "This reset link has expired.";
    case "revoked":
      return "This reset link is no longer valid.";
    case "already_consumed":
      return "This reset link has already been used.";
    case "max_attempts_exceeded":
      return "Too many reset attempts.";
    default:
      return "This reset link is no longer valid.";
  }
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { token, password } = parsed.data;
  const security = await getAuthSecurityContext();

  const challenge = await getAuthChallengeByToken(token);

  if (!isChallengeUsable(challenge) || challenge?.type !== "reset") {
    await publishAuthAuditEvent("auth.reset.failed", {
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "INVALID_OR_EXPIRED_RESET_CHALLENGE",
    });

    return buildFailureState("This reset link is no longer valid.");
  }

  const service = getAfendaAuthService();
  const result = await service.resetPassword({
    token,
    password,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  if (!result.ok) {
    const failed = await recordFailedChallengeAttempt(token);

    await publishAuthAuditEvent("auth.reset.failed", {
      email: challenge.email ?? undefined,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "RESET_FAILED",
      metadata: {
        attemptCount: failed.challenge?.attemptCount ?? null,
        maxAttempts: failed.challenge?.maxAttempts ?? null,
      },
    });

    return buildFailureState(result.message);
  }

  const consumeResult = await consumeAuthChallenge(token, "reset");

  if (!consumeResult.ok) {
    return buildFailureState(mapResetConsumeFailureToMessage(consumeResult.reason));
  }

  await publishAuthAuditEvent("auth.reset.completed", {
    email: challenge.email ?? undefined,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  return {
    ok: true,
    message: "Password updated successfully. Redirecting to sign in...",
    redirectTo: "/auth/signin?reset=success",
  };
}
