"use client";

import { useCallback, useState } from "react";
import { Button } from "@afenda/ui";
import type { AuditLogRow, AuditLogListResponse } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch(path: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-org-id": "demo",
      "x-dev-user-email": "admin@demo.afenda",
    },
    cache: "no-store",
  });
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 19);
  }
}

interface AuditLogsClientProps {
  initialData: AuditLogRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
}

export function AuditLogsClient({
  initialData,
  initialCursor,
  initialHasMore,
}: AuditLogsClientProps) {
  const [data, setData] = useState<AuditLogRow[]>(initialData);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/v1/audit-logs?cursor=${cursor}&limit=20`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const body: AuditLogListResponse = await res.json();
      setData((prev) => [...prev, ...body.data]);
      setCursor(body.cursor);
      setHasMore(body.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  return (
    <div className="px-8 py-6">
      {data.length === 0 ? (
        <div className="rounded border border-border py-12 text-center text-sm text-muted-foreground">
          No audit log entries found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Correlation ID</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(row.occurredAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.action}</td>
                    <td className="px-4 py-3 text-foreground">{row.entityType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.entityId ? row.entityId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.correlationId.slice(0, 8)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
