import { PortalInvitationAcceptClient } from "./PortalInvitationAcceptClient";

export default async function PortalAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return <PortalInvitationAcceptClient initialToken={typeof params.token === "string" ? params.token : undefined} />;
}
