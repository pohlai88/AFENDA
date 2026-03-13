"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { fetchBoardMeetings, type BoardMeetingRow } from "@/lib/api-client";

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export default function BoardroomPage() {
  const [meetings, setMeetings] = useState<BoardMeetingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const result = await fetchBoardMeetings({ limit: 50 });
        if (!disposed) {
          setMeetings(result.data);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Boardroom</h1>
          <p className="text-muted-foreground">
            Board meetings, agenda, resolutions, and minutes.
          </p>
        </div>
        <Button asChild>
          <Link href="/comm/boardroom/new">New meeting</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading meetings...</p>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No meetings yet. Schedule your first board meeting.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <Link className="hover:underline" href={`/comm/boardroom/${meeting.id}`}>
                    {meeting.meetingNumber}: {meeting.title}
                  </Link>
                  <Badge variant={meeting.status === "scheduled" ? "default" : "secondary"}>
                    {formatStatus(meeting.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {meeting.scheduledAt
                    ? new Date(meeting.scheduledAt).toLocaleString()
                    : "Not scheduled"}
                  {meeting.duration ? ` · ${meeting.duration} min` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
