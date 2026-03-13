import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBoardMeeting, fetchBoardMeetingMinutes } from "@/lib/api-client";
import { CreateActionItemForm } from "./CreateActionItemForm";

interface NewActionItemPageProps {
  params: Promise<{ id: string; minuteId: string }>;
}

export default async function NewActionItemPage({ params }: NewActionItemPageProps) {
  const { id: meetingId, minuteId } = await params;

  let meetingRes;
  let minutesRes;
  try {
    [meetingRes, minutesRes] = await Promise.all([
      fetchBoardMeeting(meetingId),
      fetchBoardMeetingMinutes(meetingId),
    ]);
  } catch {
    notFound();
  }

  const meeting = meetingRes.data;
  const minute = minutesRes.data.find((m) => m.id === minuteId);
  if (!minute) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <Link
          href={`/comm/boardroom/${meetingId}/minutes/${minuteId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to minutes
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add action item</h1>
        <p className="text-sm text-muted-foreground">
          Meeting: {meeting.meetingNumber}: {meeting.title}
        </p>
      </div>
      <CreateActionItemForm meetingId={meetingId} minuteId={minuteId} />
    </div>
  );
}
