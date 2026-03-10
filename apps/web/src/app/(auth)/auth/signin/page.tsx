import { SignInTabs } from "./SignInTabs";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; tab?: string }>;
}) {
  const params = await searchParams;
  
  // Map tab parameter to valid auth tab type
  const validTabs = ["personal", "organization", "supplier", "customer"] as const;
  const defaultTab = validTabs.includes(params.tab as any) 
    ? (params.tab as typeof validTabs[number])
    : "personal";
  
  return (
    <SignInTabs
      callbackUrl={typeof params.callbackUrl === "string" ? params.callbackUrl : "/"}
      error={typeof params.error === "string" ? params.error : undefined}
      defaultTab={defaultTab}
    />
  );
}
