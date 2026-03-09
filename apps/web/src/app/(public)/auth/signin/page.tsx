import { SignInFormClient } from "./SignInFormClient";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <SignInFormClient
      callbackUrl={typeof params.callbackUrl === "string" ? params.callbackUrl : "/"}
      error={typeof params.error === "string" ? params.error : undefined}
    />
  );
}
