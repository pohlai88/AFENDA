"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@afenda/ui";
import type { CommInboxItemRow } from "@/lib/api-client";
import { markAllInboxRead, markInboxItemRead } from "@/lib/api-client";

interface InboxClientProps {
  initialItems: CommInboxItemRow[];
}

function getEntityHref(item: CommInboxItemRow): string {
  switch (item.entityType) {
    case "task":
      return `/comm/tasks/${item.entityId}`;
    case "project":
      return `/comm/projects/${item.entityId}`;
    case "approval_request":
      return `/comm/approvals/${item.entityId}`;
    case "announcement":
      return `/comm/announcements/${item.entityId}`;
    default:
      return "/comm";
  }
}

export default function InboxClient({ initialItems }: InboxClientProps) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const unreadCount = useMemo(
    () => initialItems.filter((item) => !item.isRead).length,
    [initialItems],
  );

  async function onMarkOneRead(itemId: string) {
    setPendingIds((prev) => new Set([...prev, itemId]));
    try {
      await markInboxItemRead({ itemId });
      router.refresh();
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function onMarkAllRead() {
    setIsMutating(true);
    try {
      await markAllInboxRead();
      router.refresh();
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Unread</CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant={unreadCount > 0 ? "default" : "secondary"}>{unreadCount}</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onMarkAllRead()}
              disabled={isMutating || unreadCount === 0}
            >
              {isMutating ? "Updating..." : "Mark All Read"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {initialItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Your inbox is clear</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New activity will appear here as collaboration events arrive.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {!item.isRead ? <Badge>Unread</Badge> : null}
                  </div>
                  {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.occurredAt).toLocaleString()} • {item.entityType}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={getEntityHref(item)}>Open</Link>
                  </Button>
                  {!item.isRead ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void onMarkOneRead(item.id)}
                      disabled={pendingIds.has(item.id)}
                    >
                      {pendingIds.has(item.id) ? "..." : "Mark Read"}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
