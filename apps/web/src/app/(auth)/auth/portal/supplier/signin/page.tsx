import { redirect } from "next/navigation";

export default async function SupplierPortalSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  
  const queryParams = new URLSearchParams();
  queryParams.set("tab", "supplier");
  
  if (params.callbackUrl) {
    queryParams.set("callbackUrl", params.callbackUrl);
  }
  
  if (params.error) {
    queryParams.set("error", params.error);
  }
  
  redirect(`/auth/signin?${queryParams.toString()}`);
}
