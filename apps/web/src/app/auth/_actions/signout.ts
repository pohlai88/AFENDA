"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";

export async function signOutAction() {
  try {
    await publishAuthAuditEvent("auth.signout", {});
    await signOut({
      redirectTo: "/auth/signin?signedOut=success",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/auth/signin?status=auth_error");
  }
}

function isRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const e = error as Error & { digest?: string };
  return e.digest === "NEXT_REDIRECT";
}
