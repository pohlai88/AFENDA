/**
 * Approval list client — interactive table with load-more pagination.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@afenda/ui";
import type { ApprovalRequestRow } from "@/lib/api-client";
import { fetchApprovals } from "@/lib/api-client";

interface ApprovalListClientProps {
  initialData: ApprovalRequestRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
}

const URGENCY_CLASSES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
  high: "bg-accent text-accent-foreground ring-1 ring-border",
  normal: "bg-primary/10 text-primary ring-1 ring-primary/20",
  low: "bg-muted text-muted-foreground",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-accent text-accent-foreground ring-1 ring-border",
  approved: "bg-primary/10 text-primary ring-1 ring-primary/20",
  rejected: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
  escalated: "bg-secondary text-secondary-foreground ring-1 ring-border",
  expired: "bg-muted text-muted-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};

function dueDateLabel(dueDate: string | null): string {
  if (!dueDate) return "—";
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays}d`;
}

export default function ApprovalListClient({
  initialData,
  initialCursor,
  initialHasMore,
}: ApprovalListClientProps) {
  const [approvals, setApprovals] = useState(initialData);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (!cursor || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetchApprovals({ cursor, limit: 20 });
      setApprovals((prev) => [...prev, ...res.data]);
      setCursor(res.cursor ?? null);
      setHasMore(res.hasMore ?? false);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (approvals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No approval requests found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Number</th>
              <th className="px-4 py-2 text-left font-medium">Title</th>
              <th className="px-4 py-2 text-left font-medium">Urgency</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Step</th>
              <th className="px-4 py-2 text-left font-medium">Due</th>
              <th className="px-4 py-2 text-left font-medium">Requested</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval) => {
              const dueLabel = dueDateLabel(approval.dueDate);
              const isOverdue =
                approval.dueDate !== null && new Date(approval.dueDate) < new Date();

              return (
                <tr key={approval.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/comm/approvals/${approval.id}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {approval.approvalNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/comm/approvals/${approval.id}`}
                      className="text-primary hover:underline"
                    >
                      {approval.title}
                    </Link>
                    {approval.sourceEntityType && (
                      <p className="text-xs text-muted-foreground">{approval.sourceEntityType}</p>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_CLASSES[approval.urgency] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {approval.urgency}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[approval.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {approval.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                    {approval.currentStepIndex + 1}
                  </td>
                  <td
                    className={`px-4 py-2 text-xs ${isOverdue && approval.status === "pending" ? "font-semibold text-destructive" : "text-muted-foreground"}`}
                  >
                    {dueLabel}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(approval.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => {
              void loadMore();
            }}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </>
  );
}
