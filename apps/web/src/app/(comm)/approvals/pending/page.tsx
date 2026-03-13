import Link from "next/link";
import { fetchPendingApprovals } from "@/lib/api-client";
import ApprovalListClient from "../ApprovalListClient";

/** Approvals pending the current user's action. */
export default async function PendingApprovalsPage() {
  const res = await fetchPendingApprovals({ limit: 20 });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Pending Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Requests waiting for your action.</p>
        </div>
        <Link
          href="/comm/approvals"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All Approvals
        </Link>
      </div>

      <ApprovalListClient
        initialData={res.data}
        initialCursor={res.cursor ?? null}
        initialHasMore={res.hasMore ?? false}
      />
    </div>
  );
}
