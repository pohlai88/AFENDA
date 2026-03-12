"use server";

import { getBaseUrl } from "@/auth";
import { auth as neonAuth, isNeonAuthConfigured } from "@/lib/auth/server";
import { auth } from "@/auth";

/**
 * Send Neon Auth verification email to the current user.
 * Uses auth.sendVerificationEmail({ callbackURL }) with absolute URL.
 * Call from Security settings or any authenticated page.
 */
export async function sendVerificationEmailAction(callbackPath = "/app"): Promise<
  | { ok: true; message: string }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to send a verification email." };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Email verification is not configured." };
  }

  const path = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
  const callbackURL = `${getBaseUrl()}${path}`;

  try {
    const sendVerificationEmail = neonAuth.sendVerificationEmail?.bind(neonAuth) as
      | ((opts: { email: string; callbackURL?: string }) => Promise<{ data?: unknown; error?: { message?: string } }>)
      | undefined;

    if (!sendVerificationEmail) {
      return { ok: false, error: "Send verification email is not available." };
    }

    const { error } = await sendVerificationEmail({
      email: session.user.email,
      callbackURL,
    });

    if (error) {
      return { ok: false, error: error.message ?? "Failed to send verification email." };
    }

    return {
      ok: true,
      message: "Verification email sent. Check your inbox and follow the link.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send verification email.";
    return { ok: false, error: message };
  }
}
