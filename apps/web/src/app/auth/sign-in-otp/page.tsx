import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EmailOtpSignInPanel } from "@/app/auth/_components/EmailOtpSignInPanel";
import { buildPostSignInPath, resolveSafeRedirectPath } from "@/lib/auth/redirects";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SignInOtpPageProps = {
  searchParams: Promise<{
    next?: string;
    email?: string;
  }>;
};

export default async function SignInOtpPage({ searchParams }: SignInOtpPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");
  const session = await auth();

  if (session?.user) {
    redirect(buildPostSignInPath(nextPath));
  }

  return (
    <EmailOtpSignInPanel
      nextPath={nextPath}
      initialEmail={params.email}
      isAuthConfigured={isNeonAuthConfigured}
    />
  );
}
