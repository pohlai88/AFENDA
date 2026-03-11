"use server";

import {
  buildSuccessState,
  buildValidationErrorState,
} from "../_lib/auth-errors";
import type { AuthActionState } from "../_lib/auth-state";
import { forgotPasswordSchema } from "../_lib/auth-schemas";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getResetRedirectUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/auth/reset-password`;
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const successMessage =
    "If an account exists for this email, reset instructions have been sent.";

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  try {
    const res = await fetch(`${API_BASE}/v1/auth/request-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        email: parsed.data.email,
        redirectUrl: getResetRedirectUrl(),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return buildSuccessState(successMessage);
    }

    return buildSuccessState(successMessage);
  } catch {
    return buildSuccessState(successMessage);
  }
}
