import { redirect } from "next/navigation";
import { buildPortalSignInRedirect } from "@/platform/portals";

export default async function FranchiseeSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  redirect(buildPortalSignInRedirect("franchisee", params));
}
