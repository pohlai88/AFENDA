import { SignInFormClient } from "../../../signin/SignInFormClient";

export default async function CustomerPortalSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <SignInFormClient
      callbackUrl={typeof params.callbackUrl === "string" ? params.callbackUrl : "/portal/customer"}
      error={typeof params.error === "string" ? params.error : undefined}
      portal="customer"
    />
  );
}
