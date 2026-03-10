import { redirect } from "next/navigation";
import { buildPortalSignInRedirect } from "@/platform/portals";

export default async function CustomerPortalSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  redirect(buildPortalSignInRedirect("customer", params));
}
