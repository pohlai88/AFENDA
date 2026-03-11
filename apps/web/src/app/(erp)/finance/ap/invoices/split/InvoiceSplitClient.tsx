"use client";

/**
 * InvoiceSplitClient — SplitWorkspace scaffold for master-detail invoices.
 *
 * Left: list. Right: detail for selected record.
 */
import { useCallback, useState } from "react";
import Link from "next/link";
import {
  SplitWorkspace,
  GeneratedList,
  Button,
  useShellStore,
  formatMoney,
} from "@afenda/ui";
import type { SortState, PaginationState } from "@afenda/ui";
import type { CapabilityResult } from "@afenda/contracts";
import { fetchInvoices, type InvoiceRow } from "@/lib/api-client";

interface InvoiceSplitClientProps {
  initialData: InvoiceRow[];
  initialCursor: string | null;
  initialHasMore: boolean;
  capabilities: CapabilityResult;
}

export default function InvoiceSplitClient({
  initialData,
  initialCursor,
  initialHasMore,
  capabilities,
}: InvoiceSplitClientProps) {
  const [data, setData] = useState<InvoiceRow[]>(initialData);
  const [pagination, setPagination] = useState<PaginationState>({
    hasNext: initialHasMore,
    hasPrev: false,
    cursor: initialCursor ?? undefined,
  });
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);

  const selectedRecordIds = useShellStore((s) => s.selectedRecordIds);
  const setSelectedRecordIds = useShellStore((s) => s.setSelectedRecordIds);
  const selectedRecord = data.find((r) => r.id === selectedRecordIds[0]);

  const loadInvoices = useCallback(async (cursor?: string) => {
    const body = await fetchInvoices({ cursor, limit: 20 });
    setData(body.data);
    setCurrentCursor(cursor);
    setPagination({
      hasNext: body.hasMore,
      hasPrev: cursorStack.length > 0,
      cursor: body.cursor ?? undefined,
    });
  }, [cursorStack.length]);

  const handleNextPage = useCallback(() => {
    if (pagination.cursor) {
      if (currentCursor) setCursorStack((prev) => [...prev, currentCursor]);
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
        setSelectedRecordIds([id]);
        return;
      }
    },
    [setSelectedRecordIds],
  );

  const handleRowActivate = useCallback(
    (record: Record<string, unknown>) => {
      const id = record.id as string;
      if (id) setSelectedRecordIds([id]);
    },
    [setSelectedRecordIds],
  );

  const listSlot = (
    <GeneratedList
      entityKey="finance.ap_invoice"
      capabilities={capabilities}
      data={data as unknown as Record<string, unknown>[]}
      sort={{ field: "createdAt", direction: "desc" }}
      pagination={pagination}
      onSort={() => {}}
      onRowAction={handleRowAction}
      onNextPage={handleNextPage}
      onPrevPage={handlePrevPage}
      selectionMode="multi"
      selectedIds={selectedRecordIds}
      onSelectionChange={(ids) => setSelectedRecordIds(ids)}
      keyboardNav
      onRowActivate={handleRowActivate}
    />
  );

  const detailSlot = selectedRecord ? (
    <div className="space-y-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Number</dt>
        <dd>{selectedRecord.invoiceNumber}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>{selectedRecord.status}</dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd>
          {formatMoney({
            currencyCode: selectedRecord.currencyCode,
            amountMinor: BigInt(selectedRecord.amountMinor),
          })}
        </dd>
        <dt className="text-muted-foreground">Due</dt>
        <dd>{selectedRecord.dueDate ?? "—"}</dd>
      </dl>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/finance/ap/invoices/${selectedRecord.id}`}>Open full detail</Link>
      </Button>
    </div>
  ) : null;

  return (
    <SplitWorkspace
      listLabel="Invoices"
      detailLabel="Invoice detail"
      defaultListSize={50}
      listSlot={listSlot}
      detailSlot={detailSlot ?? <></>}
      hasDetail={!!selectedRecord}
    />
  );
}
