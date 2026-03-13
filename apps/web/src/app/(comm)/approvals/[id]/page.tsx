import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchApproval } from "@/lib/api-client";
import ApprovalDetailClient from "./ApprovalDetailClient";

interface ApprovalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
  const { id } = await params;

  let detailRes;
  try {
    detailRes = await fetchApproval(id);
  } catch {
    notFound();
  }

  const { request, steps, history } = detailRes.data;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{request.approvalNumber}</p>
          <h1 className="mt-1 text-3xl font-bold">{request.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs">
              {request.status}
            </span>
            <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs">
              {request.urgency}
            </span>
            {request.sourceEntityType && (
              <span className="inline-block rounded-full bg-muted px-2 py-1 text-xs">
                {request.sourceEntityType}
              </span>
            )}
          </div>
        </div>
        <Link
          href="/comm/approvals"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All Approvals
        </Link>
      </div>

      <ApprovalDetailClient request={request} steps={steps} history={history} />
    </div>
  );
}
