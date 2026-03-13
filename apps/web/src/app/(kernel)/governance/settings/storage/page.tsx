import { fetchSettings } from "@/lib/api-client";
import { StorageSettingsClient } from "./StorageSettingsClient";

const STORAGE_SETTING_KEYS = [
  "general.storage.maxUploadBytes",
  "general.storage.allowedMimeTypes",
  "general.storage.retentionDays",
] as const;

/** Storage settings — per-org upload constraints enforced server-side. */
export default async function StorageSettingsPage() {
  const { data } = await fetchSettings([...STORAGE_SETTING_KEYS]);

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Storage</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Set org-level upload size, MIME allow-list, and retention policy for evidence.
        </p>
      </div>
      <StorageSettingsClient initialSettings={data} />
    </div>
  );
}
