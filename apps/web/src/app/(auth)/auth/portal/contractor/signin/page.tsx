import { redirect } from "next/navigation";

export default function ContractorSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = searchParams as unknown as { callbackUrl?: string };
  const callbackUrl = params?.callbackUrl ?? "/portal/contractor";
  redirect(`/auth/signin?tab=contractor&callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
