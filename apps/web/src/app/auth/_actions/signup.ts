"use server";

import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { getAfendaAuthService } from "@/features/auth/server/afenda-auth.service";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import { getAuthSecurityContext } from "@/features/auth/server/security/auth-security-context";

import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import { resolveOrganizationPostSignInRedirect } from "../_lib/auth-redirect";
import type { AuthActionState } from "../_lib/auth-state";
import { signUpSchema } from "../_lib/auth-schemas";

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    callbackUrl: formData.get("callbackUrl"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { fullName, companyName, email, password, callbackUrl } = parsed.data;
  const security = await getAuthSecurityContext();

  await publishAuthAuditEvent("auth.signup.attempt", {
    email,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
  });

  const service = getAfendaAuthService();
  const result = await service.signUp({
    fullName,
    companyName,
    email,
    password,
  });

  if (!result.ok) {
    await publishAuthAuditEvent("auth.signup.failure", {
      email,
      ipAddress: security.ipAddress,
      userAgent: security.userAgent,
      errorCode: result.code,
    });
    return buildFailureState(result.message);
  }

  await publishAuthAuditEvent("auth.signup.success", {
    email,
    userId: result.data.principalId,
    ipAddress: security.ipAddress,
    userAgent: security.userAgent,
    metadata: { orgSlug: result.data.orgSlug },
  });

  const callbackUrlResolved = resolveOrganizationPostSignInRedirect(callbackUrl);

  try {
    await signIn("credentials", {
      email,
      password,
      portal: "app",
      callbackUrl: callbackUrlResolved,
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // Sign-in after signup failed; redirect to signin so user can sign in manually
    redirect(
      `/auth/signin?signup=success&callbackUrl=${encodeURIComponent(callbackUrlResolved)}`,
    );
  }

  return { ok: true };
}

function isRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const e = error as Error & { digest?: string };
  return e.digest === "NEXT_REDIRECT";
}
