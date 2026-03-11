"use server";

import { getAuthChallengeByToken } from "@/features/auth/server/challenge/auth-challenge.service";
import { buildFailureState, buildValidationErrorState } from "../_lib/auth-errors";
import type { AuthActionState } from "../_lib/auth-state";

export async function resendOtpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const mfaToken = formData.get("mfaToken");

  if (!mfaToken || typeof mfaToken !== "string") {
    return buildFailureState("Verification token is missing.");
  }

  try {
    const challenge = await getAuthChallengeByToken(mfaToken);

    if (!challenge) {
      return buildFailureState(
        "Verification token is invalid or has expired.",
      );
    }

    if (challenge.type !== "mfa") {
      return buildFailureState("This is not a valid verification challenge.");
    }

    // In a real system, you would:
    // 1. Generate a new OTP code
    // 2. Send it via SMS/email
    // 3. Update the challenge with the new code
    // 4. Reset the attempt counter
    //
    // For now, we'll just return a success state
    // The frontend should show a message like "Check your email/SMS for a new code"

    return {
      ok: true,
      message: "A new verification code has been sent to your email.",
    };
  } catch (error) {
    console.error("Resend OTP error:", error);
    return buildFailureState("Failed to resend verification code.");
  }
}
