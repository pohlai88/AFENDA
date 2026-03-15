import { ResetPasswordPanel } from "@/app/auth/_components/ResetPasswordPanel";
import { resolveSafeRedirectPath } from "@/lib/auth/redirects";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    next?: string;
    token?: string;
  }>;
};

function toInitialError(token: string | undefined): string | undefined {
  if (!token || token === "INVALID_TOKEN") {
    return "This password reset link is invalid or has expired.";
  }

  return undefined;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");

  return (
    <ResetPasswordPanel
      nextPath={nextPath}
      token={params.token}
      initialError={toInitialError(params.token)}
      isAuthConfigured={isNeonAuthConfigured}
    />
  );
}