import { redirect } from "next/navigation";

export default function FranchiseeSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = searchParams as unknown as { callbackUrl?: string };
  const callbackUrl = params?.callbackUrl ?? "/portal/franchisee";
  redirect(`/auth/signin?tab=franchisee&callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
