import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBoardMeeting, fetchActionItemsByMinute } from "@/lib/api-client";
import { UpdateActionItemForm } from "./UpdateActionItemForm";

interface UpdateActionItemPageProps {
  params: Promise<{ id: string; minuteId: string; actionItemId: string }>;
}

export default async function UpdateActionItemPage({ params }: UpdateActionItemPageProps) {
  const { id: meetingId, minuteId, actionItemId } = await params;

  let meetingRes;
  let actionItemsRes;
  try {
    [meetingRes, actionItemsRes] = await Promise.all([
      fetchBoardMeeting(meetingId),
      fetchActionItemsByMinute(meetingId, minuteId),
    ]);
  } catch {
    notFound();
  }

  const meeting = meetingRes.data;
  const actionItem = actionItemsRes.data.find((a) => a.id === actionItemId);
  if (!actionItem) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <Link
          href={`/comm/boardroom/${meetingId}/minutes/${minuteId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to minutes
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Update action item</h1>
        <p className="text-sm text-muted-foreground">{actionItem.title}</p>
      </div>
      <UpdateActionItemForm
        meetingId={meetingId}
        minuteId={minuteId}
        actionItem={actionItem}
      />
    </div>
  );
}
