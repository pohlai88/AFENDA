import { SigninPageClient } from "./SigninPageClient";
import type { PortalType } from "@afenda/contracts";
import { PortalTypeValues } from "@afenda/contracts";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; tab?: string }>;
}) {
  const params = await searchParams;

  const portal: PortalType =
    params.tab && PortalTypeValues.includes(params.tab as PortalType)
      ? (params.tab as PortalType)
      : "app";

  const callbackUrl = params.callbackUrl || "/";

  return (
    <SigninPageClient
      initialPortal={portal}
      callbackUrl={callbackUrl}
      error={params.error}
    />
  );
}
