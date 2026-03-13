"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Switch } from "@afenda/ui";
import type { CommNotificationPreferenceRow } from "@/lib/api-client";
import { upsertNotificationPreference } from "@/lib/api-client";

interface PreferencesClientProps {
  initialPreferences: CommNotificationPreferenceRow[];
}

const DEFAULT_EVENT_TYPES = [
  "COMM.TASK_ASSIGNED",
  "COMM.TASK_STATUS_CHANGED",
  "COMM.APPROVAL_REQUESTED",
  "COMM.COMMENT_MENTIONS_CREATED",
] as const;

function getPref(
  list: CommNotificationPreferenceRow[],
  eventType: string,
  channel: "in_app" | "email",
): CommNotificationPreferenceRow | undefined {
  return list.find((item) => item.eventType === eventType && item.channel === channel);
}

export default function PreferencesClient({ initialPreferences }: PreferencesClientProps) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const rows = useMemo(() => {
    return DEFAULT_EVENT_TYPES.map((eventType) => ({
      eventType,
      inApp: getPref(initialPreferences, eventType, "in_app")?.enabled ?? true,
      email: getPref(initialPreferences, eventType, "email")?.enabled ?? false,
    }));
  }, [initialPreferences]);

  async function onToggle(eventType: string, channel: "in_app" | "email", nextEnabled: boolean) {
    const key = `${eventType}:${channel}`;
    setBusyKey(key);
    try {
      await upsertNotificationPreference({
        eventType,
        channel,
        enabled: nextEnabled,
      });
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.eventType}
            className="grid grid-cols-1 items-center gap-4 rounded-md border p-4 md:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <p className="text-sm font-medium">{row.eventType}</p>
              <p className="text-xs text-muted-foreground">Choose where this event is delivered.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">In-app</span>
              <Switch
                checked={row.inApp}
                onCheckedChange={(checked) => {
                  void onToggle(row.eventType, "in_app", checked);
                }}
                disabled={busyKey === `${row.eventType}:in_app`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Email</span>
              <Switch
                checked={row.email}
                onCheckedChange={(checked) => {
                  void onToggle(row.eventType, "email", checked);
                }}
                disabled={busyKey === `${row.eventType}:email`}
              />
            </div>
          </div>
        ))}

        <div className="pt-2">
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
