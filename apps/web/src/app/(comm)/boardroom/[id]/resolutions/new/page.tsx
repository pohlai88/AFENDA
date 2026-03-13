import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBoardMeeting } from "@/lib/api-client";
import { ProposeResolutionForm } from "./ProposeResolutionForm";

interface ProposeResolutionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposeResolutionPage({ params }: ProposeResolutionPageProps) {
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
        <h1 className="mt-2 text-2xl font-bold">Propose resolution</h1>
      </div>
      <ProposeResolutionForm meetingId={id} />
    </div>
  );
}
