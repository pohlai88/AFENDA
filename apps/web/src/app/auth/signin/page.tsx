import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { SignInPageClient } from "./SignInPageClient";
import type { AuthActionState } from "../_lib/auth-state";

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    next?: string;
    oauth_error?: string;
    reset?: string;
    signedOut?: string;
    signup?: string;
    status?: string;
  }>;
}

function sanitizeCallbackUrl(value?: string): string | undefined {
  if (!value) return undefined;
  return value.startsWith("/") ? value : undefined;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl ?? params.next);
  const session = await auth();

  // Avoid auth-page flicker and unnecessary client work when a valid session already exists.
  if (session?.user) {
    redirect(callbackUrl ?? "/app");
  }

  let noticeState: AuthActionState | undefined;

  if (params.reset === "success") {
    noticeState = {
      ok: true,
      message: "Your password has been updated. Sign in with your new password.",
    };
  } else if (params.signedOut === "success") {
    noticeState = {
      ok: true,
      message: "You have been signed out successfully.",
    };
  } else if (params.signup === "success") {
    noticeState = {
      ok: true,
      message: "Account created. Sign in to continue.",
    };
  } else if (params.status === "auth_error") {
    noticeState = {
      ok: false,
      message: "Authentication is temporarily unavailable. Please try again.",
    };
  } else if (params.oauth_error) {
    noticeState = {
      ok: false,
      message: params.oauth_error,
    };
  }

  return <SignInPageClient callbackUrl={callbackUrl} noticeState={noticeState} />;
}
