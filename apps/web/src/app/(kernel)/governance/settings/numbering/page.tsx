import { fetchNumberingConfig } from "@/lib/api-client";
import { NumberingClient } from "./NumberingClient";

/** Numbering settings — document sequence prefixes and padding. */
export default async function NumberingSettingsPage() {
  const { data } = await fetchNumberingConfig();

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Numbering</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Document sequence prefixes, padding, and next values.
        </p>
      </div>
      <NumberingClient initialConfigs={data.configs} />
    </div>
  );
}
