"use client";

import { useCallback, useState } from "react";

import { CreateOrganizationClient } from "./CreateOrganizationClient";
import { InviteMemberClient } from "./InviteMemberClient";
import { ListOrganizationsClient } from "./ListOrganizationsClient";

export function OrganizationsSettingsClient() {
  const [refreshNonce, setRefreshNonce] = useState(0);

  const requestOrganizationsRefresh = useCallback(() => {
    setRefreshNonce((current) => current + 1);
  }, []);

  return (
    <div className="max-w-lg space-y-10 px-8 py-6">
      <ListOrganizationsClient refreshNonce={refreshNonce} />
      <div className="border-t" />
      <InviteMemberClient onMutationSuccess={requestOrganizationsRefresh} />
      <div className="border-t" />
      <CreateOrganizationClient onMutationSuccess={requestOrganizationsRefresh} />
    </div>
  );
}
