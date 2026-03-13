import Link from "next/link";
import { fetchApprovalPolicies } from "@/lib/api-client";
import ApprovalPoliciesClient from "./ApprovalPoliciesClient";

/** Approval policies list page. */
export default async function ApprovalPoliciesPage() {
  const res = await fetchApprovalPolicies({ limit: 30 });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approval Policies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define automatic routing rules for approval requests.
          </p>
        </div>
        <Link
          href="/comm/approvals"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Approvals
        </Link>
      </div>

      <ApprovalPoliciesClient
        initialData={res.data}
        initialCursor={res.cursor ?? null}
        initialHasMore={res.hasMore ?? false}
      />
    </div>
  );
}
