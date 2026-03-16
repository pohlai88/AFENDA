import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EmailAuthPanel } from "@/app/(public)/auth/_components/EmailAuthPanel";
import { buildPostSignInPath, resolveSafeRedirectPath } from "@/lib/auth/redirects";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

function toInitialError(code: string | undefined): string | undefined {
  if (code === "auth_unavailable") {
    return "Neon Auth is not configured for this environment.";
  }

  return undefined;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");
  const session = await auth();

  if (session?.user) {
    redirect(buildPostSignInPath(nextPath));
  }

  return (
    <EmailAuthPanel
      mode="sign-in"
      nextPath={nextPath}
      initialError={toInitialError(params.error)}
      isAuthConfigured={isNeonAuthConfigured}
    />
  );
}
