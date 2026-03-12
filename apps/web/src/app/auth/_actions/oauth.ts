"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";

function sanitizeCallbackUrl(callbackUrl?: string): string {
  if (!callbackUrl) return "/app";
  return callbackUrl.startsWith("/") ? callbackUrl : "/app";
}

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { digest?: string };
  return typeof e.digest === "string" && e.digest.startsWith("NEXT_REDIRECT");
}

function signInPageWithOAuthError(message: string, callbackUrl: string): never {
  const params = new URLSearchParams({ oauth_error: message });
  if (callbackUrl && callbackUrl !== "/app") params.set("callbackUrl", callbackUrl);
  redirect(`/auth/signin?${params.toString()}`);
}

export async function signInWithGoogleAction(formData: FormData) {
  const callbackUrl = sanitizeCallbackUrl(String(formData.get("callbackUrl") ?? ""));
  try {
    await signIn("google", { callbackUrl });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Google sign-in failed. Try again or use email.";
    signInPageWithOAuthError(message, callbackUrl);
  }
}

export async function signInWithGitHubAction(formData: FormData) {
  const callbackUrl = sanitizeCallbackUrl(String(formData.get("callbackUrl") ?? ""));
  try {
    await signIn("github", { callbackUrl });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "GitHub sign-in failed. Try again or use email.";
    signInPageWithOAuthError(message, callbackUrl);
  }
}
