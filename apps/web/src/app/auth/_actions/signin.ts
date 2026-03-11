"use server";

import { randomBytes } from "node:crypto";
import type { PortalType } from "@afenda/contracts";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";

import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import {
  buildVerifyRedirect,
  resolveOrganizationPostSignInRedirect,
  resolvePortalPostSignInRedirect,
} from "../_lib/auth-redirect";
import type { AuthActionState } from "../_lib/auth-state";
import { portalSignInSchema, signInSchema } from "../_lib/auth-schemas";

import { canAccessPortal } from "@/features/auth/server/access/portal-access.service";
import { getAfendaAuthService } from "@/features/auth/server/afenda-auth.service";
import { mapVerifyCredentialsResultToUser } from "@/features/auth/server/auth-user.mapper";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  buildChallengeExpiry,
  createAuthChallenge,
} from "@/features/auth/server/challenge/auth-challenge.service";
import { checkAuthRateLimit } from "@/features/auth/server/rate-limit/rate-limit.service";
import { evaluateAuthRisk } from "@/features/auth/server/risk/auth-risk.service";
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

function resolvePortalRedirect(portal: PortalType, callbackUrl?: string | null) {
  if (callbackUrl && callbackUrl.startsWith("/")) return callbackUrl;
  return portal === "app" ? "/app" : `/portal/${portal}`;
}

async function runPortalSignIn(params: {
  portal: PortalType;
  email: string;
  password: string;
  callbackUrl?: string;
}): Promise<AuthActionState> {
  const { portal, email, password, callbackUrl } = params;
  const security = await getAuthSecurityContext();

  try {

  const rateLimit = await checkAuthRateLimit(
    `signin:${portal}:${security.ipAddress ?? "unknown"}:${email.toLowerCase()}`,
    { limit: 5, windowSeconds: 300 },
  );

  if (!rateLimit.allowed) {
    await safePublishAuthAuditEvent("auth.signin.failure", {
      email,
      portal,
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "RATE_LIMITED",
      metadata: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });

    return buildFailureState("Too many sign-in attempts. Please try again later.");
  }

  const risk = await evaluateAuthRisk({
    email,
    portal,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  if (risk.blocked) {
    await safePublishAuthAuditEvent("auth.signin.failure", {
      email,
      portal,
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "RISK_BLOCKED",
      metadata: {
        riskLevel: risk.level,
        reasons: risk.reasons,
      },
    });

    return buildFailureState("This sign-in attempt was blocked.");
  }

  await safePublishAuthAuditEvent("auth.signin.attempt", {
    email,
    portal,
    callbackUrl,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
    metadata: {
      riskLevel: risk.level,
      riskReasons: risk.reasons,
    },
  });

  const authService = getAfendaAuthService();
  const result = await authService.verifyCredentials({
    email,
    password,
    portal,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  const user = mapVerifyCredentialsResultToUser(result, portal);

  if (!user) {
    await safePublishAuthAuditEvent("auth.signin.failure", {
      email,
      portal,
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "INVALID_CREDENTIALS",
    });

    return buildFailureState("Invalid email or password.");
  }

  const allowedPortal = await canAccessPortal({
    portal,
    roles: user.roles,
    permissions: user.permissions,
  });

  if (!allowedPortal) {
    await safePublishAuthAuditEvent("auth.signin.failure", {
      email,
      userId: user.id,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      portal,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: "PORTAL_ACCESS_DENIED",
    });

    return buildFailureState("You do not have access to this portal.");
  }

  if (user.requiresMfa || risk.requiresMfa) {
    const mfaChallengeToken = randomBytes(32).toString("hex");
    await createAuthChallenge({
      type: "mfa",
      rawToken: mfaChallengeToken,
      email: user.email,
      portal,
      callbackUrl,
      userId: user.id,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      expiresAt: buildChallengeExpiry(10),
      maxAttempts: 5,
      metadata: {
        riskLevel: risk.level,
        riskReasons: risk.reasons,
      },
    });

    await safePublishAuthAuditEvent("auth.signin.mfa_required", {
      email,
      userId: user.id,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      portal,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      metadata: {
        riskLevel: risk.level,
        riskReasons: risk.reasons,
      },
    });

    redirect(
      buildVerifyRedirect({
        callbackUrl: resolvePortalRedirect(portal, callbackUrl),
        mfaToken: mfaChallengeToken,
      }),
    );
  }

  await safePublishAuthAuditEvent("auth.signin.success", {
    email,
    userId: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    portal,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  try {
    const callbackUrlResolved =
      portal === "app"
        ? resolveOrganizationPostSignInRedirect(callbackUrl)
        : resolvePortalPostSignInRedirect(portal, callbackUrl);

    await signIn("credentials", {
      email,
      password,
      portal,
      callbackUrl: callbackUrlResolved,
    });

    return { ok: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (isCredentialsSigninError(error)) {
      return buildFailureState("Invalid email or password.");
    }
    return buildFailureState("Unable to sign in. Please try again.");
  }

  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (process.env.NODE_ENV !== "production") {
      const detail = error instanceof Error ? error.message : "unknown error";
      return buildFailureState(`Unable to sign in right now. ${detail}`);
    }
    return buildFailureState("Unable to sign in right now. Please try again.");
  }
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  return runPortalSignIn({
    portal: "app",
    email: parsed.data.email,
    password: parsed.data.password,
    callbackUrl: parsed.data.callbackUrl,
  });
}

export async function portalSignInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = portalSignInSchema.safeParse({
    portal: formData.get("portal"),
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  return runPortalSignIn({
    portal: parsed.data.portal as PortalType,
    email: parsed.data.email,
    password: parsed.data.password,
    callbackUrl: parsed.data.callbackUrl,
  });
}

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { digest?: string };
  return typeof e.digest === "string" && e.digest.startsWith("NEXT_REDIRECT");
}

function isCredentialsSigninError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const e = error as Error & { type?: string; code?: string };
  return e.type === "CredentialsSignin" || e.code === "CredentialsSignin";
}
