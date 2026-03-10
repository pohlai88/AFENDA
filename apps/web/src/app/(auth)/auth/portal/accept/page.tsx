import { PortalInvitationAcceptClient } from "./PortalInvitationAcceptClient";

export default async function PortalAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  return <PortalInvitationAcceptClient initialToken={token} />;
}
