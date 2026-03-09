"use server";

import { changePassword as changePasswordApi } from "@/lib/api-client";

/**
 * Server action to change the authenticated user's password.
 * Runs on the server so api-client can access session cookies.
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await changePasswordApi(currentPassword, newPassword);
}
