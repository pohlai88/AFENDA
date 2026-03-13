import type { Metadata } from "next";
import { fetchInboxItems } from "@/lib/api-client";
import InboxClient from "./InboxClient";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function CommInboxPage() {
  const inboxRes = await fetchInboxItems({ limit: 100 }).catch(() => ({ data: [] }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notifications from tasks, projects, approvals, and shared collaboration events.
        </p>
      </div>

      <InboxClient initialItems={inboxRes.data} />
    </div>
  );
}
