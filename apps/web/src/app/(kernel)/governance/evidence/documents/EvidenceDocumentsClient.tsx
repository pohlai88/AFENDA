"use client";

import { useCallback, useState } from "react";
import { Button } from "@afenda/ui";
import type { DocumentRow, DocumentListResponse } from "@/lib/api-client";

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileNameFromObjectKey(objectKey: string): string {
  const parts = objectKey.split("/");
  return parts[parts.length - 1] ?? objectKey;
}

interface EvidenceDocumentsClientProps {
  initialData: DocumentRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
}

export function EvidenceDocumentsClient({
  initialData,
  initialCursor,
  initialHasMore,
}: EvidenceDocumentsClientProps) {
  const [data, setData] = useState<DocumentRow[]>(initialData);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/v1/documents?cursor=${cursor}&limit=20`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const body: DocumentListResponse = await res.json();
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
          No documents found. Upload documents via the evidence flow (presign → upload → register).
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">File</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">MIME</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Size</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uploaded</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.originalFileName ?? fileNameFromObjectKey(row.objectKey)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.mime}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatSize(row.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(row.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.id.slice(0, 8)}…
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
