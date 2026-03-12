"use server";

import { redirect } from "next/navigation";
import { auth as neonAuth, isNeonAuthConfigured } from "@/lib/auth/server";
import { auth } from "@/auth";

/**
 * Delete the current user account (Neon Auth). Irreversible.
 * Signs out and redirects to sign-in on success.
 */
export async function deleteUserAction(): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to delete your account." };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Account deletion is not configured." };
  }

  try {
    const deleteUser = neonAuth.deleteUser?.bind(neonAuth) as
      | (() => Promise<{ data?: unknown; error?: { message?: string } }>)
      | undefined;

    if (!deleteUser) {
      return { ok: false, error: "Delete account is not available." };
    }

    const { error } = await deleteUser();

    if (error) {
      return { ok: false, error: error.message ?? "Failed to delete account." };
    }

    await neonAuth.signOut();
    redirect("/auth/signin?accountDeleted=1");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Failed to delete account.";
    return { ok: false, error: message };
  }
}
