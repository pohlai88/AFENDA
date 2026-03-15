import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { OrganizationSelectorClient } from "@/app/auth/_components/OrganizationSelectorClient";
import { resolveSafeRedirectPath } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

type SelectOrganizationPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SelectOrganizationPage({ searchParams }: SelectOrganizationPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(params.next, "/app");
  const session = await auth();

  if (!session?.user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  return <OrganizationSelectorClient nextPath={nextPath} />;
}
