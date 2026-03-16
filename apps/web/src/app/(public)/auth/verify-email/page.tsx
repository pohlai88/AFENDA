import { getBaseUrl } from "@/auth";
import { VerifyEmailPanel } from "@/app/(public)/auth/_components/VerifyEmailPanel";
import { resolveSafeRedirectPath } from "@/lib/auth/redirects";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    next?: string;
    email?: string;
    token?: string;
  }>;
};

function toInitialError(token: string | undefined): string | undefined {
  if (token === "INVALID_TOKEN") {
    return "This verification link is invalid or has expired.";
  }

  return undefined;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");
  const callbackUrl = `${getBaseUrl()}/auth/verify-email?next=${encodeURIComponent(nextPath)}${
    params.email ? `&email=${encodeURIComponent(params.email)}` : ""
  }`;

  return (
    <VerifyEmailPanel
      nextPath={nextPath}
      callbackUrl={callbackUrl}
      email={params.email}
      token={params.token}
      initialError={toInitialError(params.token)}
      isAuthConfigured={isNeonAuthConfigured}
    />
  );
}
