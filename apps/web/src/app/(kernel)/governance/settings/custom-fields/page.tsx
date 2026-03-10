import { fetchCustomFieldDefs } from "@/lib/api-client";
import { CustomFieldsClient } from "./CustomFieldsClient";

export const dynamic = "force-dynamic";

/** Custom fields settings — define entity-specific metadata fields. */
export default async function CustomFieldsSettingsPage() {
  const { data } = await fetchCustomFieldDefs(undefined, true);

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Custom Fields</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Define custom metadata fields for suppliers, invoices, and other entities.
        </p>
      </div>
      <CustomFieldsClient initialDefs={data} />
    </div>
  );
}
