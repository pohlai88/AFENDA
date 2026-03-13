"use server";

import { redirect } from "next/navigation";

import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import { resolveInviteRedirect } from "../_lib/auth-redirect";
import { establishWebSessionFromGrant } from "../_lib/session-grant";
import type { AuthActionState } from "../_lib/auth-state";
import { inviteAcceptSchema } from "../_lib/auth-schemas";

import { getAfendaAuthService } from "@/features/auth/server/afenda-auth.service";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  consumeAuthChallenge,
  getAuthChallengeByToken,
  isChallengeUsable,
  recordFailedChallengeAttempt,
} from "@/features/auth/server/challenge/auth-challenge.service";
import { getAuthSecurityContext } from "@/features/auth/server/security/auth-security-context";

function mapInviteConsumeFailureToMessage(reason?: string): string {
  switch (reason) {
    case "expired":
      return "This invitation has expired.";
    case "revoked":
      return "This invitation is no longer valid.";
    case "already_consumed":
      return "This invitation has already been used.";
    case "max_attempts_exceeded":
      return "Too many invitation attempts.";
    default:
      return "This invitation is no longer valid.";
  }
}

export async function acceptInviteAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = inviteAcceptSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    callbackUrl: formData.get("callbackUrl"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { token, name, password, callbackUrl } = parsed.data;
  const security = await getAuthSecurityContext();

  const challenge = await getAuthChallengeByToken(token);

  if (!isChallengeUsable(challenge) || challenge?.type !== "invite") {
    await publishAuthAuditEvent("auth.invite.accept_failed", {
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "INVALID_OR_EXPIRED_INVITE_CHALLENGE",
    });

    return buildFailureState("This invitation is no longer valid.");
  }

  const service = getAfendaAuthService();
  const result = await service.acceptInvite({
    token,
    name,
    password,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  if (!result.ok) {
    const failed = await recordFailedChallengeAttempt(token);

    await publishAuthAuditEvent("auth.invite.accept_failed", {
      email: challenge.email ?? undefined,
      portal: challenge.portal ?? undefined,
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "INVITE_ACCEPT_FAILED",
      metadata: {
        attemptCount: failed.challenge?.attemptCount ?? null,
        maxAttempts: failed.challenge?.maxAttempts ?? null,
      },
    });

    return buildFailureState(result.message);
  }

  const consumeResult = await consumeAuthChallenge(token, "invite");

  if (!consumeResult.ok) {
    return buildFailureState(mapInviteConsumeFailureToMessage(consumeResult.reason));
  }

  const { email, portal, sessionGrant } = result.data;

  await publishAuthAuditEvent("auth.invite.accepted", {
    email,
    userId: "",
    tenantId: "",
    tenantSlug: "demo",
    portal,
    callbackUrl,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  const redirectUrl = resolveInviteRedirect(callbackUrl);

  await establishWebSessionFromGrant({ grant: sessionGrant, redirectTo: redirectUrl });

  redirect(redirectUrl);
}
