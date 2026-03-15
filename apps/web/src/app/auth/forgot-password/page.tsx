import { redirect } from "next/navigation";

import { auth, getBaseUrl } from "@/auth";
import { ForgotPasswordPanel } from "@/app/auth/_components/ForgotPasswordPanel";
import { resolveSafeRedirectPath } from "@/lib/auth/redirects";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");
  const session = await auth();

  if (session?.user) {
    redirect(nextPath);
  }

  const resetRedirectUrl = `${getBaseUrl()}/auth/reset-password?next=${encodeURIComponent(nextPath)}`;

  return (
    <ForgotPasswordPanel
      nextPath={nextPath}
      resetRedirectUrl={resetRedirectUrl}
      isAuthConfigured={isNeonAuthConfigured}
    />
  );
}