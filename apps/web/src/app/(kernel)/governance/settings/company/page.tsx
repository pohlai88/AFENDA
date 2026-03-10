import { fetchOrganization, fetchSettings } from "@/lib/api-client";
import { CompanySettingsClient } from "./CompanySettingsClient";

export const dynamic = "force-dynamic";

/** Company settings — org profile and company address fields. */
export default async function CompanySettingsPage() {
  const [orgRes, settingsRes] = await Promise.all([
    fetchOrganization(),
    fetchSettings(),
  ]);

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Company</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Organisation identity, address, and company profile.
        </p>
      </div>
      <CompanySettingsClient
        initialOrg={orgRes.data}
        initialSettings={settingsRes.data}
      />
    </div>
  );
}
