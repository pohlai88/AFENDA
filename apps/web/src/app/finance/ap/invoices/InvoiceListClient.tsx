"use client";

/**
 * Client-side interactive wrapper for the AP Invoice list.
 *
 * Receives initial data via server component props; handles sort,
 * pagination, and row actions on the client.
 */

import { useCallback, useState } from "react";
import { GeneratedList } from "@afenda/ui";
import type { SortState, PaginationState } from "@afenda/ui";
import type { CapabilityResult } from "@afenda/contracts";
import type { InvoiceRow, InvoiceListResponse } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch(path: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Org-Id": "00000000-0000-0000-0000-000000000001",
      "X-Dev-Principal": "admin@demo.afenda",
    },
    cache: "no-store",
  });
}

interface InvoiceListClientProps {
  initialData: InvoiceRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
  capabilities: CapabilityResult;
}

export default function InvoiceListClient({
  initialData,
  initialCursor,
  initialHasMore,
  capabilities,
}: InvoiceListClientProps) {
  const [data, setData] = useState<InvoiceRow[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<SortState>({ field: "createdAt", direction: "desc" });
  const [pagination, setPagination] = useState<PaginationState>({
    hasNext: initialHasMore,
    hasPrev: false,
    cursor: initialCursor ?? undefined,
  });

  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);

  const loadInvoices = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (cursor) query.set("cursor", cursor);
        query.set("limit", "20");
        const qs = query.toString();

        const res = await apiFetch(`/v1/invoices${qs ? `?${qs}` : ""}`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const body: InvoiceListResponse = await res.json();

        setData(body.data);
        setCurrentCursor(cursor);
        setPagination({
          hasNext: body.hasMore,
          hasPrev: cursorStack.length > 0,
          cursor: body.cursor ?? undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    },
    [cursorStack.length],
  );

  const handleSort = useCallback((next: SortState) => {
    setSort(next);
  }, []);

  const handleNextPage = useCallback(() => {
    if (pagination.cursor) {
      if (currentCursor) {
        setCursorStack((prev) => [...prev, currentCursor]);
      }
      void loadInvoices(pagination.cursor);
    }
  }, [pagination.cursor, currentCursor, loadInvoices]);

  const handlePrevPage = useCallback(() => {
    if (cursorStack.length === 0) return;
    const prev = cursorStack[cursorStack.length - 1];
    setCursorStack((s) => s.slice(0, -1));
    void loadInvoices(prev);
  }, [cursorStack, loadInvoices]);

  const handleRowAction = useCallback(
    (actionKey: string, row: Record<string, unknown>) => {
      const id = row.id as string;
      if (actionKey === "view" || actionKey === "edit") {
        window.location.href = `/finance/ap/invoices/${id}`;
        return;
      }
      console.log(`Row action: ${actionKey} on ${id}`);
    },
    [],
  );

  if (error) {
    return (
      <div className="border border-destructive/30 rounded-lg p-8 text-center">
        <p className="text-destructive font-medium">Failed to load invoices</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <button
          onClick={() => void loadInvoices()}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <GeneratedList
      entityKey="finance.ap_invoice"
      capabilities={capabilities}
      data={data as unknown as Record<string, unknown>[]}
      sort={sort}
      pagination={pagination}
      onSort={handleSort}
      onRowAction={handleRowAction}
      onNextPage={handleNextPage}
      onPrevPage={handlePrevPage}
    />
  );
}
