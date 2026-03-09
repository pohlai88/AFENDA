"use client";

/**
 * GeneratedList — metadata-driven table component.
 *
 * Reads the entity's ListViewDef from the registry, resolves each column
 * to its FieldKit.CellRenderer, and renders a shadcn-style data table.
 *
 * RULES:
 *   1. Never makes permission decisions — capabilities come as props.
 *   2. Fields with `fieldCaps[key] === "hidden"` are omitted entirely.
 *   3. Row actions gated by `actionCaps[actionKey].allowed`.
 *   4. Disabled actions show the denial reason as a tooltip.
 *   5. Uses DS tokens only — no hardcoded palette colors.
 *   6. When data.length > virtualizationThreshold, uses @tanstack/react-virtual
 *      for efficient rendering (1000-row list < 1s target).
 */
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CapabilityResult, FieldCap } from "@afenda/contracts";
import { getEntityRegistration } from "../meta/registry";
import { getFieldKit } from "../field-kit/registry";
import type { CellRendererProps } from "../field-kit/types";
import { FieldKitErrorBoundary } from "./FieldKitErrorBoundary";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/table";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Checkbox } from "../components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { Input } from "../components/input";
import { Label } from "../components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/alert-dialog";
import { Skeleton } from "../components/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar";
import { Progress } from "../components/progress";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis
} from "../components/pagination";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

export interface PaginationState {
  hasNext: boolean;
  hasPrev: boolean;
  cursor?: string;
}

/** A single active filter — field + operator + value */
export interface ActiveFilter {
  fieldKey: string;
  op: string;
  value: string;
}

export interface GeneratedListProps {
  /** Entity key from the registry (e.g. `"finance.ap_invoice"`) */
  entityKey: string;
  /** View key — defaults to `"default"` */
  viewKey?: string;
  /** Resolved capabilities for the current principal + entity */
  capabilities: CapabilityResult;
  /** Row data — each record is a flat key/value map */
  data: readonly Record<string, unknown>[];
  /** Current sort state */
  sort?: SortState;
  /** Pagination state */
  pagination?: PaginationState;
  /** Current active filters */
  filters?: readonly ActiveFilter[];
  /** Called when a column header is clicked for sorting */
  onSort?: (sort: SortState) => void;
  /** Called when filters change */
  onFilterChange?: (filters: ActiveFilter[]) => void;
  /** Called when a row action is triggered */
  onRowAction?: (actionKey: string, record: Record<string, unknown>) => void;
  /** Called when "Next page" is clicked */
  onNextPage?: () => void;
  /** Called when "Previous page" is clicked */
  onPrevPage?: () => void;
  /** Enable multi-select; when set, adds checkbox column and calls onSelectionChange */
  selectionMode?: "none" | "multi";
  /** Currently selected row IDs (when selectionMode is "multi") */
  selectedIds?: string[];
  /** Called when selection changes (when selectionMode is "multi") */
  onSelectionChange?: (ids: string[]) => void;
  /** When provided, only these column keys are shown (ColumnManager integration) */
  visibleColumnKeys?: string[];
  /** Enable keyboard navigation (arrow keys, Enter) */
  keyboardNav?: boolean;
  /** Called when user activates a row via keyboard (Enter) */
  onRowActivate?: (record: Record<string, unknown>) => void;
  /**
   * When data.length exceeds this threshold, virtualization is enabled.
   * Default 50. Set to Infinity to disable virtualization.
   */
  virtualizationThreshold?: number;
  /** Max height of the virtualized scroll container (e.g. "70vh"). Default "70vh". */
  virtualizedMaxHeight?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve the field capability for a field key, defaulting to "hidden" if missing. */
function resolveFieldCap(capabilities: CapabilityResult, fieldKey: string): FieldCap {
  return capabilities.fieldCaps[fieldKey] ?? "hidden";
}

/** Check if an action is allowed. */
function isActionAllowed(capabilities: CapabilityResult, actionKey: string): boolean {
  return capabilities.actionCaps[actionKey]?.allowed ?? false;
}

/** Get the denial reason for a disabled action. */
function getActionReason(capabilities: CapabilityResult, actionKey: string): string | undefined {
  return capabilities.actionCaps[actionKey]?.reason?.message;
}

// ── Column resolver ───────────────────────────────────────────────────────────

interface ResolvedColumn {
  fieldKey: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: number;
  pin?: "left" | "right";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer: ComponentType<CellRendererProps<any>>;
  /** Extra class for numeric/money columns */
  cellClassName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeneratedList({
  entityKey,
  viewKey = "default",
  capabilities,
  data,
  sort,
  pagination,
  filters: activeFilters,
  onSort,
  onFilterChange,
  onRowAction,
  onNextPage,
  onPrevPage,
  selectionMode = "none",
  selectedIds = [],
  onSelectionChange,
  visibleColumnKeys,
  keyboardNav = false,
  onRowActivate,
  virtualizationThreshold = 50,
  virtualizedMaxHeight = "70vh",
}: GeneratedListProps) {
  // ── Render performance instrumentation ───────────────────────────
  const renderStart = useRef(performance.now());
  renderStart.current = performance.now();

  useEffect(() => {
    const duration = performance.now() - renderStart.current;
    performance.mark(`GeneratedList:${entityKey}:rendered`);
    performance.measure(
      `GeneratedList:${entityKey}:render`,
      { start: renderStart.current, duration },
    );
  });

  // ── Resolve metadata ─────────────────────────────────────────────
  const registration = useMemo(
    () => getEntityRegistration(entityKey),
    [entityKey],
  );

  const view = useMemo(() => {
    const v = registration.views[viewKey];
    if (!v || v.viewType !== "list") {
      throw new Error(
        `[GeneratedList] View "${viewKey}" on entity "${entityKey}" is not a list view`,
      );
    }
    return v;
  }, [registration, viewKey, entityKey]);

  const fieldDefMap = useMemo(() => {
    const map = new Map<string, (typeof registration.fieldDefs)[number]>();
    for (const fd of registration.fieldDefs) {
      map.set(fd.fieldKey, fd);
    }
    return map;
  }, [registration]);

  // ── Resolve visible columns ──────────────────────────────────────
  const columns: ResolvedColumn[] = useMemo(() => {
    if (!view.columns) return [];
    let filtered = view.columns.filter(
      (col) => resolveFieldCap(capabilities, col.fieldKey) !== "hidden",
    );
    if (visibleColumnKeys && visibleColumnKeys.length > 0) {
      const keySet = new Set(visibleColumnKeys);
      filtered = filtered.filter((col) => keySet.has(col.fieldKey));
    }
    return filtered.map((col) => {
        const fieldDef = fieldDefMap.get(col.fieldKey);
        const fieldType = fieldDef?.fieldType ?? "string";
        const kit = getFieldKit(fieldType);
        const isNumeric = ["int", "decimal", "money", "percent"].includes(fieldType);

        return {
          fieldKey: col.fieldKey,
          label: fieldDef?.label ?? col.fieldKey,
          align: col.align ?? (isNumeric ? "right" : "left"),
          width: col.width,
          pin: col.pin,
          Renderer: kit.CellRenderer,
          cellClassName: isNumeric ? "tabular-nums" : undefined,
        } satisfies ResolvedColumn;
      });
  }, [view, capabilities, fieldDefMap, visibleColumnKeys]);

  // ── Resolve row actions ──────────────────────────────────────────
  const rowActions = useMemo(() => {
    if (!view.rowActions) return [];
    return view.rowActions.map((ra) => ({
      actionKey: ra.actionKey,
      label: ra.label,
      variant: ra.variant ?? ("default" as const),
      confirm: ra.confirm ?? false,
      allowed: isActionAllowed(capabilities, ra.actionKey),
      reason: getActionReason(capabilities, ra.actionKey),
    }));
  }, [view, capabilities]);

  const hasRowActions = rowActions.length > 0;

  // ── Resolve filterable fields ────────────────────────────────────
  const filterableFields = useMemo(() => {
    const viewFilters = (view as { filters?: readonly { fieldKey: string }[] }).filters ?? [];
    if (viewFilters.length === 0) return [];

    return viewFilters
      .filter((f) => resolveFieldCap(capabilities, f.fieldKey) !== "hidden")
      .map((f) => {
        const fieldDef = fieldDefMap.get(f.fieldKey);
        const fieldType = fieldDef?.fieldType ?? "string";
        const kit = getFieldKit(fieldType);
        return {
          fieldKey: f.fieldKey,
          label: fieldDef?.label ?? f.fieldKey,
          fieldType,
          filterOps: kit.filterOps,
          enumValues: fieldDef?.enumValues as string[] | undefined,
        };
      })
      .filter((f) => f.filterOps.length > 0);
  }, [view, capabilities, fieldDefMap]);

  const hasFilters = filterableFields.length > 0;

  // ── Filter handlers ──────────────────────────────────────────────
  const handleAddFilter = useCallback(
    (fieldKey: string, op: string, value: string) => {
      if (!onFilterChange) return;
      const current = activeFilters ? [...activeFilters] : [];
      // Replace existing filter on the same field+op or add new
      const idx = current.findIndex((f) => f.fieldKey === fieldKey && f.op === op);
      if (idx >= 0) {
        current[idx] = { fieldKey, op, value };
      } else {
        current.push({ fieldKey, op, value });
      }
      onFilterChange(current);
    },
    [activeFilters, onFilterChange],
  );

  const handleRemoveFilter = useCallback(
    (fieldKey: string, op: string) => {
      if (!onFilterChange || !activeFilters) return;
      onFilterChange(activeFilters.filter((f) => !(f.fieldKey === fieldKey && f.op === op)));
    },
    [activeFilters, onFilterChange],
  );

  const handleClearFilters = useCallback(() => {
    onFilterChange?.([]);
  }, [onFilterChange]);

  // ── Sort handler ─────────────────────────────────────────────────
  const handleSort = useCallback(
    (fieldKey: string) => {
      if (!onSort) return;
      const direction =
        sort?.field === fieldKey && sort.direction === "asc" ? "desc" : "asc";
      onSort({ field: fieldKey, direction });
    },
    [onSort, sort],
  );

  // ── Row action handler ───────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<{
    actionKey: string;
    record: Record<string, unknown>;
  } | null>(null);

  const handleRowAction = useCallback(
    (actionKey: string, record: Record<string, unknown>, requireConfirm: boolean) => {
      if (requireConfirm) {
        setConfirmAction({ actionKey, record });
        return;
      }
      onRowAction?.(actionKey, record);
    },
    [onRowAction],
  );

  const confirmAndExecute = useCallback(() => {
    if (confirmAction) {
      onRowAction?.(confirmAction.actionKey, confirmAction.record);
      setConfirmAction(null);
    }
  }, [confirmAction, onRowAction]);

  // ── Selection handlers ───────────────────────────────────────────
  const hasSelection = selectionMode === "multi" && onSelectionChange;
  const currentPageIds = useMemo(
    () => data.map((r) => (r["id"] as string) ?? "").filter(Boolean),
    [data],
  );
  const allSelected =
    hasSelection && currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const someSelected = hasSelection && currentPageIds.some((id) => selectedIds.includes(id));

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !currentPageIds.includes(id)));
    } else {
      const merged = new Set([...selectedIds, ...currentPageIds]);
      onSelectionChange([...merged]);
    }
  }, [onSelectionChange, allSelected, selectedIds, currentPageIds]);

  const handleSelectRow = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((x) => x !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    },
    [onSelectionChange, selectedIds],
  );

  // ── Keyboard navigation ───────────────────────────────────────────
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!keyboardNav || data.length === 0) return;
      const maxIdx = data.length - 1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedRowIndex((prev) => (prev < maxIdx ? prev + 1 : prev));
          return;
        case "ArrowUp":
          e.preventDefault();
          setFocusedRowIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return;
        case "Home":
          e.preventDefault();
          setFocusedRowIndex(0);
          return;
        case "End":
          e.preventDefault();
          setFocusedRowIndex(maxIdx);
          return;
        case "Enter":
          if (focusedRowIndex >= 0 && focusedRowIndex < data.length) {
            e.preventDefault();
            const record = data[focusedRowIndex] as Record<string, unknown>;
            onRowActivate?.(record);
          }
          return;
        default:
          return;
      }
    },
    [keyboardNav, data, focusedRowIndex, onRowActivate],
  );

  // ── Virtualization ─────────────────────────────────────────────────
  const useVirtualization = data.length > virtualizationThreshold;
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const colCount = columns.length + (hasRowActions ? 1 : 0) + (hasSelection ? 1 : 0);
  const gridCols = `repeat(${colCount}, minmax(0, 1fr))`;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      ref={tableRef}
      className={keyboardNav ? "space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" : "space-y-4"}
      tabIndex={keyboardNav ? 0 : undefined}
      onKeyDown={keyboardNav ? handleKeyDown : undefined}
      role={keyboardNav ? "grid" : undefined}
      aria-rowcount={keyboardNav ? data.length : undefined}
      aria-colcount={keyboardNav ? colCount : undefined}
      aria-activedescendant={keyboardNav && focusedRowIndex >= 0 ? `row-${focusedRowIndex}` : undefined}
    >
      {/* Filter bar */}
      {hasFilters && onFilterChange && (
        <FilterBar
          filterableFields={filterableFields}
          activeFilters={activeFilters ?? []}
          onAdd={handleAddFilter}
          onRemove={handleRemoveFilter}
          onClear={handleClearFilters}
        />
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {hasSelection && (
              <TableHead className="w-[1%] pr-0">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.fieldKey}
                style={col.width ? { width: col.width } : undefined}
                className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : undefined}
              >
                {onSort ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort(col.fieldKey)}
                    className="inline-flex h-auto gap-1 px-0 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    {sort?.field === col.fieldKey && (
                      <span className="text-xs" aria-hidden="true">
                        {sort.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </Button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
            {hasRowActions && (
              <TableHead className="w-[1%] whitespace-nowrap text-right">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>

        {useVirtualization && data.length > 0 ? (
          <TableBody>
            <TableRow>
              <TableCell colSpan={colCount} className="p-0 border-0">
                <div
                  ref={parentRef}
                  className="overflow-auto"
                  style={{ maxHeight: virtualizedMaxHeight }}
                  role="rowgroup"
                  aria-label="Table body"
                >
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const record = data[virtualRow.index] as Record<string, unknown>;
                      const rowId = (record["id"] as string) ?? "";
                      const rowIdx = virtualRow.index;
                      const isFocused = keyboardNav && focusedRowIndex === rowIdx;
                      return (
                        <div
                          key={virtualRow.key}
                          data-index={rowIdx}
                          id={keyboardNav ? `row-${rowIdx}` : undefined}
                          role="row"
                          className={`border-b transition-colors hover:bg-muted/50 grid ${isFocused ? "bg-muted/50" : ""}`}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                            gridTemplateColumns: gridCols,
                          }}
                          onMouseDown={keyboardNav ? () => setFocusedRowIndex(rowIdx) : undefined}
                        >
                          {hasSelection && (
                            <div className="p-2 flex items-center [&>[role=checkbox]]:translate-y-[2px]">
                              <Checkbox
                                checked={selectedIds.includes(rowId)}
                                onCheckedChange={() => handleSelectRow(rowId)}
                                aria-label={`Select row ${rowIdx + 1}`}
                              />
                            </div>
                          )}
                          {columns.map((col) => (
                            <div
                              key={col.fieldKey}
                              className={[
                                "p-2 align-middle whitespace-nowrap",
                                col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "",
                                col.cellClassName,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <FieldKitErrorBoundary
                                entityKey={entityKey}
                                fieldKey={col.fieldKey}
                                fieldType={fieldDefMap.get(col.fieldKey)?.fieldType ?? "string"}
                                mode="cell"
                                value={record[col.fieldKey]}
                              >
                                <col.Renderer
                                  value={record[col.fieldKey]}
                                  fieldKey={col.fieldKey}
                                  record={record}
                                  validation={
                                    fieldDefMap.get(col.fieldKey)?.validationJson as
                                      | Record<string, unknown>
                                      | undefined
                                  }
                                />
                              </FieldKitErrorBoundary>
                            </div>
                          ))}
                          {hasRowActions && (
                            <div className="p-2 flex items-center justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-xs">
                                    <span className="sr-only">Actions</span>
                                    ⋯
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {rowActions.map((action) => (
                                    <DropdownMenuItem
                                      key={action.actionKey}
                                      variant={action.variant === "destructive" ? "destructive" : "default"}
                                      disabled={!action.allowed}
                                      onSelect={() =>
                                        handleRowAction(action.actionKey, record, action.confirm)
                                      }
                                    >
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        ) : (
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((record, rowIdx) => {
                const rowId = (record["id"] as string) ?? "";
                const isFocused = keyboardNav && focusedRowIndex === rowIdx;
                return (
                  <TableRow
                    key={rowId || rowIdx}
                    id={keyboardNav ? `row-${rowIdx}` : undefined}
                    data-index={rowIdx}
                    className={isFocused ? "bg-muted/50" : undefined}
                    onMouseDown={keyboardNav ? () => setFocusedRowIndex(rowIdx) : undefined}
                  >
                    {hasSelection && (
                      <TableCell className="pr-0">
                        <Checkbox
                          checked={selectedIds.includes(rowId)}
                          onCheckedChange={() => handleSelectRow(rowId)}
                          aria-label={`Select row ${rowIdx + 1}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.fieldKey}
                        className={[
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : undefined,
                          col.cellClassName,
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined}
                      >
                        <FieldKitErrorBoundary
                          entityKey={entityKey}
                          fieldKey={col.fieldKey}
                          fieldType={fieldDefMap.get(col.fieldKey)?.fieldType ?? "string"}
                          mode="cell"
                          value={record[col.fieldKey]}
                        >
                          <col.Renderer
                            value={record[col.fieldKey]}
                            fieldKey={col.fieldKey}
                            record={record}
                            validation={
                              fieldDefMap.get(col.fieldKey)?.validationJson as
                                | Record<string, unknown>
                                | undefined
                            }
                          />
                        </FieldKitErrorBoundary>
                      </TableCell>
                    ))}
                    {hasRowActions && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs">
                              <span className="sr-only">Actions</span>
                              ⋯
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions.map((action) => (
                              <DropdownMenuItem
                                key={action.actionKey}
                                variant={action.variant === "destructive" ? "destructive" : "default"}
                                disabled={!action.allowed}
                                onSelect={() =>
                                  handleRowAction(action.actionKey, record, action.confirm)
                                }
                              >
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        )}
      </Table>

      {/* Pagination */}
      {pagination && (pagination.hasNext || pagination.hasPrev) && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={onPrevPage}
                className={!pagination.hasPrev ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext 
                onClick={onNextPage}
                className={!pagination.hasNext ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Confirmation dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to execute &ldquo;
              {rowActions.find((a) => a.actionKey === confirmAction?.actionKey)?.label ?? confirmAction?.actionKey}
              &rdquo;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={confirmAndExecute}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── FilterBar (internal) ──────────────────────────────────────────────────────

interface FilterableField {
  fieldKey: string;
  label: string;
  fieldType: string;
  filterOps: readonly { op: string; label: string }[];
  enumValues?: string[];
}

interface FilterBarProps {
  filterableFields: FilterableField[];
  activeFilters: readonly ActiveFilter[];
  onAdd: (fieldKey: string, op: string, value: string) => void;
  onRemove: (fieldKey: string, op: string) => void;
  onClear: () => void;
}

function FilterBar({
  filterableFields,
  activeFilters,
  onAdd,
  onRemove,
  onClear,
}: FilterBarProps) {
  const [selectedField, setSelectedField] = useState("");
  const [selectedOp, setSelectedOp] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const currentField = filterableFields.find((f) => f.fieldKey === selectedField);
  const currentOps = currentField?.filterOps ?? [];

  const handleApply = useCallback(() => {
    if (!selectedField || !selectedOp || !filterValue) return;
    onAdd(selectedField, selectedOp, filterValue);
    setFilterValue("");
  }, [selectedField, selectedOp, filterValue, onAdd]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        {/* Field selector */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Field</Label>
          <Select
            value={selectedField}
            onValueChange={(v) => {
              setSelectedField(v);
              setSelectedOp("");
              setFilterValue("");
            }}
          >
            <SelectTrigger className="h-8 rounded-md border border-input bg-background px-2 py-1.5 text-sm">
              <SelectValue placeholder="Select field…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Select field…</SelectItem>
              {filterableFields.map((f) => (
                <SelectItem key={f.fieldKey} value={f.fieldKey}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operator selector */}
        {currentOps.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Operator</Label>
            <Select value={selectedOp} onValueChange={setSelectedOp}>
              <SelectTrigger className="h-8 rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select…</SelectItem>
                {currentOps.map((op) => (
                  <SelectItem key={op.op} value={op.op}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Value input */}
        {selectedOp && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Value</Label>
            {currentField?.enumValues ? (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="h-8 rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select…</SelectItem>
                  {currentField.enumValues.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : currentField?.fieldType === "bool" ? (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="h-8 rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select…</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            ) : currentField?.fieldType === "date" || currentField?.fieldType === "datetime" ? (
              <Input
                type="date"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            ) : (
              <Input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                placeholder="Value…"
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            )}
          </div>
        )}

        {/* Apply button */}
        {selectedField && selectedOp && filterValue && (
          <Button variant="outline" size="sm" onClick={handleApply}>
            Apply
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => {
            const field = filterableFields.find((f) => f.fieldKey === filter.fieldKey);
            const op = field?.filterOps.find((o) => o.op === filter.op);
            return (
              <span
                key={`${filter.fieldKey}-${filter.op}`}
                className="inline-flex items-center gap-1 rounded-full border border-input bg-muted px-2.5 py-0.5 text-xs"
              >
                <span className="font-medium">{field?.label ?? filter.fieldKey}</span>
                <span className="text-muted-foreground">{op?.label ?? filter.op}</span>
                <span>&ldquo;{filter.value}&rdquo;</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemove(filter.fieldKey, filter.op)}
                  className="ml-0.5 h-auto p-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${field?.label ?? filter.fieldKey} filter`}
                >
                  ×
                </Button>
              </span>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}