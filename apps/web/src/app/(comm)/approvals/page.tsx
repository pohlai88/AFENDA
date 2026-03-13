import Link from "next/link";
import { Button } from "@afenda/ui";
import { fetchApprovals } from "@/lib/api-client";
import ApprovalListClient from "./ApprovalListClient";

interface ApprovalListPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** COMM Approvals queue — server-fetched, client interactive. */
export default async function ApprovalListPage({ searchParams }: ApprovalListPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const limit = typeof params.limit === "string" ? parseInt(params.limit) : 20;

  const approvalsRes = await fetchApprovals({ limit, status });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and act on approval requests across the organisation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/approvals/pending">My Pending</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comm/approvals/policies">Policies</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/comm/approvals/new">+ New Request</Link>
          </Button>
        </div>
      </div>

      <ApprovalListClient
        initialData={approvalsRes.data}
        initialCursor={approvalsRes.cursor ?? null}
        initialHasMore={approvalsRes.hasMore ?? false}
      />
    </div>
  );
}
