import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBoardMeeting } from "@/lib/api-client";
import { AddAgendaItemForm } from "./AddAgendaItemForm";

interface AddAgendaItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function AddAgendaItemPage({ params }: AddAgendaItemPageProps) {
  const { id } = await params;

  let meetingRes;
  try {
    meetingRes = await fetchBoardMeeting(id);
  } catch {
    notFound();
  }

  const meeting = meetingRes.data;
  if (meeting.status !== "draft" && meeting.status !== "scheduled") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <Link
          href={`/comm/boardroom/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {meeting.meetingNumber}: {meeting.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add agenda item</h1>
      </div>
      <AddAgendaItemForm meetingId={id} />
    </div>
  );
}
