import { fetchSettings } from "@/lib/api-client";
import { GeneralSettingsClient } from "./GeneralSettingsClient";

/** General settings — units, locale, financial, notifications, email. */
export default async function GeneralSettingsPage() {
  const { data } = await fetchSettings();

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">General</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Units, locale, financial defaults, and notification preferences.
        </p>
      </div>
      <GeneralSettingsClient initialSettings={data} />
    </div>
  );
}
