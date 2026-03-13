import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBoardMeeting } from "@/lib/api-client";
import { RecordMinutesForm } from "./RecordMinutesForm";

interface RecordMinutesPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordMinutesPage({ params }: RecordMinutesPageProps) {
  const { id } = await params;

  let meetingRes;
  try {
    meetingRes = await fetchBoardMeeting(id);
  } catch {
    notFound();
  }

  const meeting = meetingRes.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <Link
          href={`/comm/boardroom/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {meeting.meetingNumber}: {meeting.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Record minutes</h1>
      </div>
      <RecordMinutesForm meetingId={id} />
    </div>
  );
}
