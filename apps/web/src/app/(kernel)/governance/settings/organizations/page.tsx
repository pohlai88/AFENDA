import { CreateOrganizationClient } from "./CreateOrganizationClient";
import { ListOrganizationsClient } from "./ListOrganizationsClient";
import { InviteMemberClient } from "./InviteMemberClient";

export const dynamic = "force-dynamic";

/** Organizations settings — create and manage organizations (Neon Auth organizations plugin). */
export default async function OrganizationsSettingsPage() {
  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Organizations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Create organizations and switch between them from the workspace selector.
        </p>
      </div>
      <div className="max-w-lg space-y-10 px-8 py-6">
        <ListOrganizationsClient />
        <div className="border-t" />
        <InviteMemberClient />
        <div className="border-t" />
        <CreateOrganizationClient />
      </div>
    </div>
  );
}
