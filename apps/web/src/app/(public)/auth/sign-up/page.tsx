import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EmailAuthPanel } from "@/app/(public)/auth/_components/EmailAuthPanel";
import { buildPostSignInPath, resolveSafeRedirectPath } from "@/lib/auth/redirects";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");
  const session = await auth();

  if (session?.user) {
    redirect(buildPostSignInPath(nextPath));
  }

  return (
    <EmailAuthPanel mode="sign-up" nextPath={nextPath} isAuthConfigured={isNeonAuthConfigured} />
  );
}
