import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PostSignInGateClient } from "@/app/auth/_components/PostSignInGateClient";
import { resolveSafeRedirectPath } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

type PostSignInPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function PostSignInPage({ searchParams }: PostSignInPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");
  const session = await auth();

  if (!session?.user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  return <PostSignInGateClient nextPath={nextPath} />;
}
