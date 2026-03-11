import { VerifyClientPage } from "./verify-client";

interface VerifyPageProps {
  searchParams: Promise<{ callbackUrl?: string; mfaToken?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;

  return (
    <VerifyClientPage
      callbackUrl={params.callbackUrl}
      mfaToken={params.mfaToken}
    />
  );
}
