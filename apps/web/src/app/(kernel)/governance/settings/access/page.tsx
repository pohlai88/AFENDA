import { fetchOrgMembers } from "@/lib/api-client";
import { AccessClient } from "./AccessClient";

/** Access settings — org members and roles. */
export default async function AccessSettingsPage() {
  const { data } = await fetchOrgMembers();

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Access</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Organisation members and their roles.
        </p>
      </div>
      <AccessClient members={data.members} />
    </div>
  );
}
