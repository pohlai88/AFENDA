"use server";

import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { auth } from "@/auth";
import {
  changePassword as changePasswordApi,
  confirmTotpSetup,
  disableMfa,
  generateTotpSetup,
} from "@/lib/api-client";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }
  return session;
}

/**
 * Server action to change the authenticated user's password.
 * Runs on the server so api-client can access session cookies.
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await requireSession();
  await changePasswordApi(currentPassword, newPassword);
}

/**
 * Generate a new TOTP secret + pre-rendered QR code data URI.
 * Runs server-side so the `qrcode` package can render the PNG.
 */
export async function generateTotpSetupAction(): Promise<{
  secret: string;
  qrCodeDataUri: string;
}> {
  await requireSession();
  const { secret, otpauthUri } = await generateTotpSetup();
  const qrCodeDataUri = await QRCode.toDataURL(otpauthUri, {
    width: 200,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return { secret, qrCodeDataUri };
}

/**
 * Verify the user's trial code against the generated secret, then persist the enrollment.
 * Throws on invalid code.
 */
export async function confirmTotpSetupAction(secret: string, code: string): Promise<void> {
  await requireSession();
  await confirmTotpSetup(secret, code);
}

/** Remove TOTP enrollment, disabling MFA for the authenticated user. */
export async function disableMfaAction(): Promise<void> {
  await requireSession();
  await disableMfa();
}
