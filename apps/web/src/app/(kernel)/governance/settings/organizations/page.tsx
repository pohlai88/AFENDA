import { OrganizationsSettingsClient } from "./OrganizationsSettingsClient";

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
      <OrganizationsSettingsClient />
    </div>
  );
}
