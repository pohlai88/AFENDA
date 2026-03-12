"use server";

import type { PortalType } from "@afenda/contracts";
import { redirect } from "next/navigation";

import { getBaseUrl } from "@/auth";
import { auth as neonAuth, isNeonAuthConfigured } from "@/lib/auth/server";

import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import { resolveOrganizationPostSignInRedirect, resolvePortalPostSignInRedirect } from "../_lib/auth-redirect";
import type { AuthActionState } from "../_lib/auth-state";
import { portalSignInSchema, signInSchema } from "../_lib/auth-schemas";

import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { checkAuthRateLimit } from "@/features/auth/server/rate-limit/rate-limit.service";
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
    if (!isNeonAuthConfigured || !neonAuth) {
      return buildFailureState(
        "Authentication is not configured. Set Neon Auth environment variables to continue.",
      );
    }

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

    await safePublishAuthAuditEvent("auth.signin.attempt", {
      email,
      portal,
      callbackUrl,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
    });

    const callbackUrlResolved =
      portal === "app"
        ? resolveOrganizationPostSignInRedirect(callbackUrl)
        : resolvePortalPostSignInRedirect(portal, callbackUrl);

    const path = callbackUrlResolved.startsWith("/") ? callbackUrlResolved : `/${callbackUrlResolved}`;
    const absoluteCallbackURL = `${getBaseUrl()}${path}`;

    const result = await neonAuth.signIn.email({
      email,
      password,
      callbackURL: absoluteCallbackURL,
    });

    if (result.error) {
      await safePublishAuthAuditEvent("auth.signin.failure", {
        email,
        portal,
        callbackUrl,
        ipAddress: security.ipAddress,
        userAgent: security.userAgent,
        errorCode: result.error.code ?? "INVALID_CREDENTIALS",
      });

      return buildFailureState(result.error.message ?? "Invalid email or password.");
    }

    await safePublishAuthAuditEvent("auth.signin.success", {
      email,
      userId: result.data?.user.id,
      portal,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
    });

    redirect(callbackUrlResolved);

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
