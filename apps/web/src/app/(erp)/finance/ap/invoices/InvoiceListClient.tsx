"use client";

/**
 * Client-side interactive wrapper for the AP Invoice list.
 *
 * Receives initial data via server component props; handles sort,
 * pagination, row selection, and row actions on the client.
 * Uses metadata-driven export (CSV/Excel/PDF), AlertDialog for bulk confirm,
 * and @media print for print-optimized layout.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GeneratedList,
  Button,
  OperationalListWorkspace,
  ColumnManager,
  QuickFilters,
  useShellStore,
  useShellBreadcrumb,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@afenda/ui";
import type { SortState, PaginationState, ActiveFilter } from "@afenda/ui";
import type { CapabilityResult } from "@afenda/contracts";
import {
  fetchInvoices,
  bulkInvoiceAction,
  type InvoiceRow,
} from "@/lib/api-client";
import {
  getExportColumns,
  downloadCsv,
  exportToExcel,
  exportToPdf,
} from "@/lib/export-utils";
import { BulkActionConfirmDialog } from "@/components/BulkActionConfirmDialog";

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
  const router = useRouter();
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

  const selectedRecordIds = useShellStore((s) => s.selectedRecordIds);
  const setSelectedRecordIds = useShellStore((s) => s.setSelectedRecordIds);
  const setBreadcrumbs = useShellBreadcrumb()?.setBreadcrumbs;

  useEffect(() => {
    setBreadcrumbs?.([
      { label: "Finance", href: "/finance" },
      { label: "AP", href: "/finance/ap" },
      { label: "Invoices" },
    ]);
    return () => setBreadcrumbs?.([]);
  }, [setBreadcrumbs]);
  const selectedRecords = useMemo(
    () => data.filter((r) => selectedRecordIds.includes(r.id)) as unknown as Record<string, unknown>[],
    [data, selectedRecordIds],
  );

  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [activeQuickFilterKey, setActiveQuickFilterKey] = useState<string | null>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(20);

  const loadInvoices = useCallback(
    async (cursor?: string, overrideLimit?: number) => {
      setLoading(true);
      setError(null);
      const limit = overrideLimit ?? pageSize;
      try {
        const statusFilter = activeFilters.find((f) => f.fieldKey === "status");
        const body = await fetchInvoices({
          cursor,
          limit,
          status: statusFilter?.value,
        });

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
    [cursorStack.length, activeFilters, pageSize],
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
        router.push(`/finance/ap/invoices/${id}`);
        return;
      }
      // TODO: Implement additional row actions (duplicate, export, etc.)
    },
    [router],
  );

  if (error) {
    return (
      <div className="border border-destructive/30 rounded-lg p-8 text-center">
        <p className="text-destructive font-medium">Failed to load invoices</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void loadInvoices()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const entityKey = "finance.ap_invoice";

  const columnOptions = useMemo(() => {
    const cols = getExportColumns(entityKey);
    return cols.map((c) => ({ fieldKey: c.fieldKey, label: c.label }));
  }, [entityKey]);

  const defaultVisibleKeys = useMemo(
    () => columnOptions.map((c) => c.fieldKey),
    [columnOptions],
  );

  const effectiveVisibleKeys =
    visibleColumnKeys.length > 0 ? visibleColumnKeys : defaultVisibleKeys;

  const exportColumns = useMemo(
    () => getExportColumns(entityKey, effectiveVisibleKeys),
    [entityKey, effectiveVisibleKeys],
  );

  const quickFilters = useMemo(
    () => [
      { key: "all", label: "All", filters: [] as { fieldKey: string; op: string; value: string }[] },
      { key: "submitted", label: "Submitted", filters: [{ fieldKey: "status", op: "eq", value: "submitted" }] },
      { key: "approved", label: "Approved", filters: [{ fieldKey: "status", op: "eq", value: "approved" }] },
      { key: "draft", label: "Draft", filters: [{ fieldKey: "status", op: "eq", value: "draft" }] },
    ],
    [],
  );

  const handleQuickFilterSelect = useCallback(
    (key: string | null) => {
      setActiveQuickFilterKey(key);
      const qf = key ? quickFilters.find((f) => f.key === key) : null;
      setActiveFilters(qf?.filters ?? []);
      void loadInvoices();
    },
    [quickFilters, loadInvoices],
  );

  const handleFilterChange = useCallback(
    (filters: ActiveFilter[]) => {
      setActiveFilters(filters);
      setActiveQuickFilterKey(null);
      void loadInvoices();
    },
    [loadInvoices],
  );

  const handleRowActivate = useCallback((record: Record<string, unknown>) => {
    const id = record.id as string;
    if (id) router.push(`/finance/ap/invoices/${id}`);
  }, [router]);

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const size = Number(value);
      setPageSize(size);
      setCursorStack([]);
      setCurrentCursor(undefined);
      void loadInvoices(undefined, size);
    },
    [loadInvoices],
  );

  const toolbarContent = (
    <>
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          Rows
        </Label>
        <Select
          value={String(pageSize)}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="1000">1000</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ColumnManager
        entityKey={entityKey}
        columns={columnOptions}
        visibleColumnKeys={effectiveVisibleKeys}
        onVisibleColumnKeysChange={setVisibleColumnKeys}
        persistKey={`afenda-column-visibility:${entityKey}`}
      />
      <QuickFilters
        filters={quickFilters}
        activeKey={activeQuickFilterKey}
        onSelect={handleQuickFilterSelect}
      />
    </>
  );

  const handleExport = useCallback(
    async (format: "csv" | "xlsx" | "pdf") => {
      const records = data as unknown as Record<string, unknown>[];
      const date = new Date().toISOString().slice(0, 10);
      try {
        if (format === "csv") {
          downloadCsv(records, exportColumns, `invoices-${date}.csv`);
          toast.success("CSV exported");
        } else if (format === "xlsx") {
          await exportToExcel(records, exportColumns, `invoices-${date}.xlsx`);
          toast.success("Excel exported");
        } else {
          await exportToPdf(
            records,
            exportColumns,
            `Invoices ${date}`,
            `invoices-${date}.pdf`,
          );
          toast.success("PDF exported");
        }
      } catch (err) {
        toast.error("Export failed");
      }
    },
    [data, exportColumns],
  );

  const handlePrint = useCallback(() => {
    window.open("/finance/ap/invoices/print", "_blank", "noopener,noreferrer");
  }, []);

  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    actionKey: string;
    records: Record<string, unknown>[];
    reason?: string;
  } | null>(null);

  const runBulkAction = useCallback(
    async (
      actionKey: string,
      records: Record<string, unknown>[],
      reason?: string,
    ): Promise<{ ok: number; failed: number }> => {
      const ids = records.map((r) => r.id as string).filter(Boolean);
      if (
        actionKey !== "bulk-approve" &&
        actionKey !== "bulk-reject" &&
        actionKey !== "bulk-void"
      ) {
        return { ok: 0, failed: ids.length };
      }

      try {
        return bulkInvoiceAction({
          actionKey,
          invoiceIds: ids,
          reason,
        });
      } catch {
        return { ok: 0, failed: ids.length };
      }
    },
    [],
  );

  const handleBulkAction = useCallback(
    (actionKey: string, records: Record<string, unknown>[]) => {
      const ids = records.map((r) => r.id as string).filter(Boolean);
      if (ids.length === 0) return;

      const needsReason = actionKey === "bulk-reject" || actionKey === "bulk-void";
      if (needsReason) {
        const reason = window.prompt(
          `Reason for ${actionKey === "bulk-reject" ? "rejecting" : "voiding"} ${ids.length} invoice(s):`,
        )?.trim();
        if (!reason) {
          toast.error("Reason is required");
          return;
        }
        setBulkDialog({ open: true, actionKey, records, reason });
      } else {
        setBulkDialog({ open: true, actionKey, records });
      }
    },
    [],
  );

  const handleBulkConfirm = useCallback(
    async () => {
      if (!bulkDialog) return { ok: 0, failed: 0 };
      const result = await runBulkAction(
        bulkDialog.actionKey,
        bulkDialog.records,
        bulkDialog.reason,
      );
      setSelectedRecordIds([]);
      void loadInvoices(currentCursor ?? undefined);
      if (result.failed === 0) {
        toast.success(`${result.ok} invoice(s) processed`);
      } else {
        toast.error(`${result.ok} succeeded, ${result.failed} failed`);
      }
      return result;
    },
    [bulkDialog, runBulkAction, setSelectedRecordIds, loadInvoices, currentCursor],
  );

  const bulkLabels: Record<string, { title: string; action: string }> = {
    "bulk-approve": { title: "Approve Invoices", action: "Approve All" },
    "bulk-reject": { title: "Reject Invoices", action: "Reject All" },
    "bulk-void": { title: "Void Invoices", action: "Void All" },
  };

  return (
    <>
      {bulkDialog && (
        <BulkActionConfirmDialog
          open={bulkDialog.open}
          onOpenChange={(open) => !open && setBulkDialog(null)}
          title={bulkLabels[bulkDialog.actionKey]?.title ?? "Bulk Action"}
          description={`This will process ${bulkDialog.records.length} invoice(s). Continue?`}
          actionLabel={bulkLabels[bulkDialog.actionKey]?.action ?? "Confirm"}
          recordCount={bulkDialog.records.length}
          onConfirm={handleBulkConfirm}
        />
      )}
      <OperationalListWorkspace
        entityKey="finance.ap_invoice"
        capabilities={capabilities}
        selection={selectedRecords}
        onExport={handleExport}
        onPrint={handlePrint}
        onBulkAction={handleBulkAction}
        toolbarContent={toolbarContent}
      >
        <GeneratedList
          entityKey="finance.ap_invoice"
          capabilities={capabilities}
          data={data as unknown as Record<string, unknown>[]}
          isLoading={loading}
          sort={sort}
          pagination={pagination}
          filters={activeFilters}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
          onRowAction={handleRowAction}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          selectionMode="multi"
          selectedIds={selectedRecordIds}
          onSelectionChange={setSelectedRecordIds}
          visibleColumnKeys={effectiveVisibleKeys}
          keyboardNav
          onRowActivate={handleRowActivate}
          emptyState={{
            title: "No invoices match this view",
            description: "Try a different filter or create a new invoice.",
            actionLabel: "Create invoice",
            onAction: () => router.push("/finance/ap/invoices/new"),
          }}
        />
      </OperationalListWorkspace>
    </>
  );
}
