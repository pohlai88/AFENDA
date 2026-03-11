import { notFound } from "next/navigation";

import { isPortalType } from "../../../_lib/portal-registry";
import { PortalSignInClientPage } from "./portal-signin-client";

interface PortalSignInPageProps {
  params: Promise<{ portal: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function PortalSignInPage({
  params,
  searchParams,
}: PortalSignInPageProps) {
  const { portal } = await params;
  const query = await searchParams;

  if (!isPortalType(portal)) {
    notFound();
  }

  return (
    <PortalSignInClientPage
      portal={portal}
      callbackUrl={query.callbackUrl}
    />
  );
}
