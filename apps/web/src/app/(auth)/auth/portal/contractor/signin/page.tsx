import { redirect } from "next/navigation";
import { buildPortalSignInRedirect } from "@/platform/portals";

export default async function ContractorSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  redirect(buildPortalSignInRedirect("contractor", params));
}
