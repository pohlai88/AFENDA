"use server";

import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { auth } from "@/auth";
import {
  changeNeonEmail,
  deleteNeonUser,
  getNeonAccountInfo,
  listNeonAccounts,
  updateNeonUser,
} from "@/lib/auth/server";
import {
  changePassword as changePasswordApi,
  confirmTotpSetup,
  disableMfa,
  generateTotpSetup,
} from "@/lib/api-client";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/app");
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

type AccountInfoPayload = {
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  accountId: string | null;
  providers: string[];
};

export async function getAccountLifecycleInfoAction(): Promise<AccountInfoPayload> {
  const session = await requireSession();

  const [accountInfo, accounts] = await Promise.all([
    getNeonAccountInfo(),
    listNeonAccounts(),
  ]);

  return {
    email: session.user.email ?? null,
    emailVerified: Boolean(session.user.emailVerified),
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    accountId: (accountInfo.data as { accountId?: string } | null)?.accountId ?? null,
    providers: (accounts.data as Array<{ provider?: string }> | null)?.flatMap((account) =>
      typeof account.provider === "string" && account.provider.length > 0
        ? [account.provider]
        : [],
    ) ?? [],
  };
}

export async function updateProfileAction(input: {
  name?: string;
  image?: string;
}): Promise<void> {
  await requireSession();

  const normalizedName = input.name?.trim();
  const normalizedImage = input.image?.trim();

  const response = await updateNeonUser({
    name: normalizedName || undefined,
    image: normalizedImage || undefined,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
}

export async function changeEmailAction(input: {
  newEmail: string;
  callbackURL?: string;
}): Promise<void> {
  await requireSession();

  const nextEmail = input.newEmail.trim().toLowerCase();
  if (!nextEmail) {
    throw new Error("New email is required.");
  }

  const response = await changeNeonEmail({
    newEmail: nextEmail,
    callbackURL: input.callbackURL,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
}

export async function deleteAccountAction(): Promise<void> {
  await requireSession();

  const response = await deleteNeonUser();
  if (response.error) {
    throw new Error(response.error.message);
  }
}
