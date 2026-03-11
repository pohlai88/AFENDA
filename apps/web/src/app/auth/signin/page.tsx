import { SignInPageClient } from "./SignInPageClient";
import type { AuthActionState } from "../_lib/auth-state";

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    reset?: string;
    signedOut?: string;
    signup?: string;
    status?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

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
  }

  return (
    <SignInPageClient
      callbackUrl={params.callbackUrl}
      noticeState={noticeState}
    />
  );
}
