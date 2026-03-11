"use server";

import { signIn } from "@/auth";

function sanitizeCallbackUrl(callbackUrl?: string): string {
  if (!callbackUrl) return "/app";
  return callbackUrl.startsWith("/") ? callbackUrl : "/app";
}

export async function signInWithGoogleAction(formData: FormData) {
  const callbackUrl = sanitizeCallbackUrl(String(formData.get("callbackUrl") ?? ""));
  await signIn("google", { callbackUrl });
}

export async function signInWithGitHubAction(formData: FormData) {
  const callbackUrl = sanitizeCallbackUrl(String(formData.get("callbackUrl") ?? ""));
  await signIn("github", { callbackUrl });
}
