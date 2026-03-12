import { SignInWithCodeClient } from "./signin-with-code-client";

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignInWithCodePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <SignInWithCodeClient callbackUrl={params.callbackUrl} />;
}
