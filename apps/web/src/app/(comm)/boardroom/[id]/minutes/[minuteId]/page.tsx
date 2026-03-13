import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchBoardMeeting,
  fetchBoardMeetingMinutes,
  fetchActionItemsByMinute,
} from "@/lib/api-client";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

interface MinuteDetailPageProps {
  params: Promise<{ id: string; minuteId: string }>;
}

function formatStatus(value: string): string {
  return value.replace(/_/g, " ");
}

export default async function MinuteDetailPage({ params }: MinuteDetailPageProps) {
  const { id: meetingId, minuteId } = await params;

  let meetingRes;
  let minutesRes;
  let actionItemsRes;
  try {
    [meetingRes, minutesRes, actionItemsRes] = await Promise.all([
      fetchBoardMeeting(meetingId),
      fetchBoardMeetingMinutes(meetingId),
      fetchActionItemsByMinute(meetingId, minuteId),
    ]);
  } catch {
    notFound();
  }

  const meeting = meetingRes.data;
  const minutes = minutesRes.data;
  const minute = minutes.find((m) => m.id === minuteId);
  const actionItems = actionItemsRes.data;

  if (!minute) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <Link
          href={`/comm/boardroom/${meetingId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {meeting.meetingNumber}: {meeting.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Minutes</h1>
        <p className="text-sm text-muted-foreground">
          Recorded {new Date(minute.recordedAt).toLocaleString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{minute.content}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Action items</CardTitle>
          <Button asChild size="sm">
            <Link href={`/comm/boardroom/${meetingId}/minutes/${minuteId}/action-items/new`}>
              Add action item
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action items yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {actionItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-muted-foreground">{item.description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{formatStatus(item.status)}</Badge>
                      {item.dueDate ? (
                        <span className="text-muted-foreground">
                          Due {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/comm/boardroom/${meetingId}/minutes/${minuteId}/action-items/${item.id}`}>
                      Update
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
