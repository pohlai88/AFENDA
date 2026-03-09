"use client";

import { useState, useTransition } from "react";
import { updateNumberingConfig } from "@/lib/api-client";
import type { NumberingConfigEntry } from "@afenda/contracts";
import { Input } from "@afenda/ui";

// ── Types ──────────────────────────────────────────────────────────────────────

type RowDraft = {
  entityType: NumberingConfigEntry["entityType"];
  prefix: string;
  padWidth: number;
  nextValue: number;
  periodKey: string;
  dirty: boolean;
};

type Props = {
  initialConfigs: NumberingConfigEntry[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPreview(prefix: string, padWidth: number, nextValue: number): string {
  return `${prefix}${String(nextValue).padStart(padWidth, "0")}`;
}

function entityTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    invoice: "Invoice",
    journalEntry: "Journal Entry",
    payment: "Payment",
    supplier: "Supplier",
  };
  return labels[t] ?? t;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NumberingClient({ initialConfigs }: Props) {
  const [rows, setRows] = useState<RowDraft[]>(() =>
    initialConfigs.map((c) => ({
      entityType: c.entityType,
      prefix: c.prefix,
      padWidth: c.padWidth,
      nextValue: c.nextValue,
      periodKey: c.periodKey,
      dirty: false,
    })),
  );

  const [savedRows, setSavedRows] = useState<RowDraft[]>(() =>
    initialConfigs.map((c) => ({
      entityType: c.entityType,
      prefix: c.prefix,
      padWidth: c.padWidth,
      nextValue: c.nextValue,
      periodKey: c.periodKey,
      dirty: false,
    })),
  );

  const [error, setError] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const _isDirty = rows.some((r) => r.dirty);

  function handleChange(
    entityType: string,
    field: keyof Pick<RowDraft, "prefix" | "padWidth" | "nextValue">,
    raw: string,
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.entityType !== entityType) return r;
        const saved = savedRows.find((s) => s.entityType === entityType);
        let updated: RowDraft;
        if (field === "prefix") {
          updated = { ...r, prefix: raw };
        } else if (field === "padWidth") {
          const n = parseInt(raw, 10);
          updated = { ...r, padWidth: isNaN(n) ? r.padWidth : Math.max(2, Math.min(10, n)) };
        } else {
          const n = parseInt(raw, 10);
          updated = { ...r, nextValue: isNaN(n) ? r.nextValue : Math.max(1, n) };
        }
        updated.dirty =
          updated.prefix !== saved?.prefix ||
          updated.padWidth !== saved?.padWidth ||
          updated.nextValue !== saved?.nextValue;
        return updated;
      }),
    );
    setError(null);
  }

  function saveRow(entityType: string) {
    const row = rows.find((r) => r.entityType === entityType);
    const saved = savedRows.find((r) => r.entityType === entityType);
    if (!row || !saved) return;

    setSavingRow(entityType);
    startTransition(async () => {
      try {
        const idempotencyKey = globalThis.crypto.randomUUID();
        await updateNumberingConfig({
          idempotencyKey,
          entityType: row.entityType,
          prefix: row.prefix !== saved.prefix ? row.prefix : undefined,
          padWidth: row.padWidth !== saved.padWidth ? row.padWidth : undefined,
          seedNextValue: row.nextValue > saved.nextValue ? row.nextValue : undefined,
        });
        setSavedRows((prev) =>
          prev.map((r) => (r.entityType === entityType ? { ...row, dirty: false } : r)),
        );
        setRows((prev) =>
          prev.map((r) => (r.entityType === entityType ? { ...r, dirty: false } : r)),
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save numbering config");
      } finally {
        setSavingRow(null);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="px-8 py-12 text-sm text-muted-foreground">
        No sequences configured for this organisation yet. Document sequences are created automatically when the first document of each type is issued.
      </div>
    );
  }

  return (
    <div className="relative px-8 py-6">
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prefix</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pad Width</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Preview</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Next Value</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSaving = savingRow === row.entityType && isPending;
              return (
                <tr key={`${row.entityType}-${row.periodKey}`} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {entityTypeLabel(row.entityType)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {row.periodKey === "" ? "default" : row.periodKey}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      value={row.prefix}
                      onChange={(e) => handleChange(row.entityType, "prefix", e.target.value)}
                      maxLength={20}
                      className="w-28 rounded border border-border bg-background px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label={`Prefix for ${row.entityType}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={row.padWidth}
                      onChange={(e) => handleChange(row.entityType, "padWidth", e.target.value)}
                      min={2}
                      max={10}
                      className="w-16 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label={`Pad width for ${row.entityType}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">
                    {formatPreview(row.prefix, row.padWidth, row.nextValue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      value={row.nextValue}
                      onChange={(e) => handleChange(row.entityType, "nextValue", e.target.value)}
                      min={1}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label={`Next value for ${row.entityType}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.dirty && (
                      <button
                        type="button"
                        onClick={() => saveRow(row.entityType)}
                        disabled={isSaving || isPending}
                        className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="mt-4 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Counters may only increase — gap-free sequences cannot be decreased.
        Year-partitioned sequences (e.g. 2026) are created automatically when the first document is issued.
      </p>
    </div>
  );
}
