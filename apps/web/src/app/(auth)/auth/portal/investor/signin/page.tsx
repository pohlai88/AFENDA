import { redirect } from "next/navigation";

export default function InvestorSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = searchParams as unknown as { callbackUrl?: string };
  const callbackUrl = params?.callbackUrl ?? "/portal/investor";
  redirect(`/auth/signin?tab=investor&callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
