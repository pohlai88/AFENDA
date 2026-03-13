import type { Metadata } from "next";
import { fetchNotificationPreferences } from "@/lib/api-client";
import PreferencesClient from "./PreferencesClient";

export const metadata: Metadata = {
  title: "Inbox Preferences",
};

export default async function CommInboxPreferencesPage() {
  const preferencesRes = await fetchNotificationPreferences().catch(() => ({ data: [] }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Inbox Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure in-app and email delivery by event type.
        </p>
      </div>
      <PreferencesClient initialPreferences={preferencesRes.data} />
    </div>
  );
}
