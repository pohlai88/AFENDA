import { notFound } from "next/navigation";
import Link from "next/link";
import {
  fetchBoardMeeting,
  fetchBoardMeetingAgendaItems,
  fetchBoardMeetingAttendees,
  fetchBoardMeetingMinutes,
  fetchBoardMeetingResolutions,
} from "@/lib/api-client";
import { ResolutionCard } from "./ResolutionCard";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

interface MeetingDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatStatus(value: string): string {
  return value.replace(/_/g, " ");
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params;

  let meetingRes;
  let agendaRes;
  let attendeesRes;
  let resolutionsRes;
  let minutesRes;
  try {
    [meetingRes, agendaRes, attendeesRes, resolutionsRes, minutesRes] = await Promise.all([
      fetchBoardMeeting(id),
      fetchBoardMeetingAgendaItems(id),
      fetchBoardMeetingAttendees(id),
      fetchBoardMeetingResolutions(id),
      fetchBoardMeetingMinutes(id),
    ]);
  } catch {
    notFound();
  }

  const meeting = meetingRes.data;
  const agendaItems = agendaRes.data;
  const attendees = attendeesRes.data;
  const resolutions = resolutionsRes.data;
  const minutes = minutesRes.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {meeting.meetingNumber}: {meeting.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meeting.scheduledAt
              ? new Date(meeting.scheduledAt).toLocaleString()
              : "Not scheduled"}
            {meeting.duration ? ` · ${meeting.duration} min` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={meeting.status === "scheduled" ? "default" : "secondary"}>
              {formatStatus(meeting.status)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/comm/boardroom">
            <span className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to list
            </span>
          </Link>
        </div>
      </div>

      {meeting.description ? (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{meeting.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Chair:</span>{" "}
            <code className="rounded bg-muted px-1">{meeting.chairId}</code>
          </p>
          <p>
            <span className="text-muted-foreground">Quorum required:</span>{" "}
            {meeting.quorumRequired}
          </p>
          {meeting.location ? (
            <p>
              <span className="text-muted-foreground">Location:</span> {meeting.location}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Agenda</CardTitle>
          {(meeting.status === "draft" || meeting.status === "scheduled") && (
            <Button asChild size="sm">
              <Link href={`/comm/boardroom/${id}/agenda/new`}>Add item</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {agendaItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agenda items yet.</p>
          ) : (
            <ol className="list-inside list-decimal space-y-2 text-sm">
              {agendaItems.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.title}</span>
                  {item.durationMinutes != null && (
                    <span className="ml-2 text-muted-foreground">
                      ({item.durationMinutes} min)
                    </span>
                  )}
                  {item.description ? (
                    <p className="ml-6 mt-0.5 text-muted-foreground">{item.description}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Attendees</CardTitle>
          {(meeting.status === "draft" || meeting.status === "scheduled") && (
            <Button asChild size="sm">
              <Link href={`/comm/boardroom/${id}/attendees/new`}>Add attendee</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendees yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {attendees.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-1 text-xs">{a.principalId}</code>
                  <Badge variant="secondary">{formatStatus(a.status)}</Badge>
                  {a.role ? (
                    <span className="text-muted-foreground">{a.role}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Minutes</CardTitle>
          <Button asChild size="sm">
            <Link href={`/comm/boardroom/${id}/minutes/new`}>Record minutes</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {minutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No minutes recorded yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {minutes.map((m) => (
                <li key={m.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {new Date(m.recordedAt).toLocaleString()}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/comm/boardroom/${id}/minutes/${m.id}`}>
                        View & action items
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap">{m.content}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Resolutions</CardTitle>
          <Button asChild size="sm">
            <Link href={`/comm/boardroom/${id}/resolutions/new`}>Propose resolution</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {resolutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resolutions yet.</p>
          ) : (
            <div className="space-y-4">
              {resolutions.map((r) => (
                <ResolutionCard
                  key={r.id}
                  resolution={r}
                  meetingId={id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
