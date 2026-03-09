import { fetchSettings } from "@/lib/api-client";
import { FeaturesSettingsClient } from "./FeaturesSettingsClient";

/** Features settings — module enable/disable toggles. */
export default async function FeaturesSettingsPage() {
  const { data } = await fetchSettings();

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Features</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Enable or disable modules for this organisation.
        </p>
      </div>
      <FeaturesSettingsClient initialSettings={data} />
    </div>
  );
}
