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
 */
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/dialog";

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
    return view.columns
      .filter((col) => resolveFieldCap(capabilities, col.fieldKey) !== "hidden")
      .map((col) => {
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
  }, [view, capabilities, fieldDefMap]);

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

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
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
            {columns.map((col) => (
              <TableHead
                key={col.fieldKey}
                style={col.width ? { width: col.width } : undefined}
                className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : undefined}
              >
                {onSort ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.fieldKey)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    {sort?.field === col.fieldKey && (
                      <span className="text-xs" aria-hidden="true">
                        {sort.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
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

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (hasRowActions ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                No records found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((record, rowIdx) => (
              <TableRow key={(record["id"] as string) ?? rowIdx}>
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
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination && (pagination.hasNext || pagination.hasPrev) && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev}
            onClick={onPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext}
            onClick={onNextPage}
          >
            Next
          </Button>
        </div>
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
          <label className="text-xs font-medium text-muted-foreground">Field</label>
          <select
            value={selectedField}
            onChange={(e) => {
              setSelectedField(e.target.value);
              setSelectedOp("");
              setFilterValue("");
            }}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Select field…</option>
            {filterableFields.map((f) => (
              <option key={f.fieldKey} value={f.fieldKey}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operator selector */}
        {currentOps.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Operator</label>
            <select
              value={selectedOp}
              onChange={(e) => setSelectedOp(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Select…</option>
              {currentOps.map((op) => (
                <option key={op.op} value={op.op}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Value input */}
        {selectedOp && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Value</label>
            {currentField?.enumValues ? (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {currentField.enumValues.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : currentField?.fieldType === "bool" ? (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : currentField?.fieldType === "date" || currentField?.fieldType === "datetime" ? (
              <input
                type="date"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            ) : (
              <input
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
                <button
                  type="button"
                  onClick={() => onRemove(filter.fieldKey, filter.op)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${field?.label ?? filter.fieldKey} filter`}
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}