"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import type { AuthActionState } from "../_lib/auth-state";
import {
  emailOtpSendSchema,
  emailOtpSignInSchema,
  emailOtpVerifySchema,
} from "../_lib/auth-schemas";

const NOT_CONFIGURED = "Email code sign-in is not configured.";

/**
 * Send a one-time code to the user's email (Neon Auth email OTP).
 * User must then call signInWithEmailOtpAction with the same email and the code they receive.
 */
export async function sendEmailOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailOtpSendSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { email } = parsed.data;

  if (!auth) {
    return buildFailureState(NOT_CONFIGURED);
  }

  try {
    // Neon Auth: auth.emailOtp.sendVerificationOtp({ email, type })
    const authAny = auth as unknown as { emailOtp?: { sendVerificationOtp?: (opts: { email: string; type: string }) => Promise<{ error?: { message?: string } }> } };
    const sendOtp = authAny.emailOtp?.sendVerificationOtp;
    if (!sendOtp) {
      return buildFailureState("Email OTP is not available.");
    }
    const result = await sendOtp({ email, type: "email-verification" });
    if (result?.error) {
      return buildFailureState(result.error.message ?? "Failed to send code.");
    }
    return {
      ok: true,
      message: "Check your email for a sign-in code.",
      email,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send code.";
    return buildFailureState(message);
  }
}

/**
 * Verify email with OTP code (Neon Auth emailOtp.verifyEmail).
 * Use after the user receives a verification OTP (e.g. from sendVerificationEmail or sendVerificationOtp).
 */
export async function verifyEmailWithOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailOtpVerifySchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { email, otp } = parsed.data;

  if (!auth) {
    return buildFailureState(NOT_CONFIGURED);
  }

  try {
    const verifyEmail = (auth as unknown as { emailOtp?: { verifyEmail?: (opts: { email: string; otp: string }) => Promise<{ error?: { message?: string } }> } }).emailOtp?.verifyEmail;
    if (!verifyEmail) {
      return buildFailureState("Email verification with OTP is not available.");
    }
    const result = await verifyEmail({ email, otp });
    if (result?.error) {
      return buildFailureState(result.error.message ?? "Invalid or expired code.");
    }
    return {
      ok: true,
      message: "Your email has been verified.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed.";
    return buildFailureState(message);
  }
}

/**
 * Sign in with email + OTP code (Neon Auth signIn.emailOtp).
 * Redirects on success to callbackUrl or /app.
 */
export async function signInWithEmailOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailOtpSignInSchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
    callbackUrl: formData.get("callbackUrl"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { email, otp, callbackUrl } = parsed.data;
  const destination =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/")
      ? callbackUrl
      : "/app";

  if (!auth) {
    return buildFailureState(NOT_CONFIGURED);
  }

  try {
    // Neon Auth: auth.signIn.emailOtp({ email, otp })
    const signInOtp = (auth as unknown as { signIn?: { emailOtp?: (opts: { email: string; otp: string }) => Promise<{ error?: { message?: string } }> } }).signIn?.emailOtp;
    if (!signInOtp) {
      return buildFailureState("Email OTP sign-in is not available.");
    }
    const result = await signInOtp({ email, otp });
    if (result?.error) {
      return buildFailureState(result.error.message ?? "Invalid or expired code.");
    }
    redirect(destination);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Invalid or expired code.";
    return buildFailureState(message);
  }
}
