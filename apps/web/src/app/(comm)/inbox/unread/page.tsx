import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { fetchInboxUnreadCount } from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Inbox Unread",
};

export default async function CommInboxUnreadPage() {
  const unreadRes = await fetchInboxUnreadCount().catch(() => ({ data: { count: 0 } }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Unread Inbox</h1>
      <Card>
        <CardHeader>
          <CardTitle>Unread Count</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{unreadRes.data.count}</p>
          <p className="mt-2 text-sm text-muted-foreground">Items currently pending review.</p>
        </CardContent>
      </Card>
    </div>
  );
}
