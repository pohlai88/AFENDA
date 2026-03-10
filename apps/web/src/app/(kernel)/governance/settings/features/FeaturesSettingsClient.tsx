"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "@/lib/api-client";
import { Switch, Label } from "@afenda/ui";
import type { SettingsResponse, SettingKey } from "@afenda/contracts";
import { isFormDirty } from "@/lib/comparison-utils";

// ── Feature flag config ────────────────────────────────────────────────────────
// Add entries here to render new feature toggles — no structural page changes needed.
// Grouped into Finance / Operations / Platform sections.
// Keys must stay aligned with SettingKeyValues.

type FeatureGroup = {
  label: string;
  description: string;
  flags: FeatureFlagConfig[];
};

type FeatureFlagConfig = {
  key: SettingKey;
  label: string;
  description: string;
};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: "Finance",
    description: "Core financial modules",
    flags: [
      {
        key: "features.ap.enabled",
        label: "Accounts Payable",
        description: "Vendor invoices, bills, and payment runs.",
      },
      {
        key: "features.ar.enabled",
        label: "Accounts Receivable",
        description: "Customer invoicing and collections.",
      },
      {
        key: "features.gl.enabled",
        label: "General Ledger",
        description: "Journal entries, chart of accounts, and trial balance.",
      },
      {
        key: "features.budgets.enabled",
        label: "Budgets",
        description: "Budget tracking and variance reporting.",
      },
      {
        key: "features.multiCurrency.enabled",
        label: "Multi-Currency",
        description: "Transactions and reporting in multiple currencies (entitlement).",
      },
    ],
  },
  {
    label: "Operations",
    description: "Supply chain and commercial modules",
    flags: [
      {
        key: "features.purchasing.enabled",
        label: "Purchasing",
        description: "Purchase orders and vendor management.",
      },
      {
        key: "features.inventory.enabled",
        label: "Inventory",
        description: "Stock tracking and warehouse management.",
      },
      {
        key: "features.project.enabled",
        label: "Projects",
        description: "Project management, timesheets, and billing.",
      },
      {
        key: "features.sales.enabled",
        label: "Sales",
        description: "Quotes, sales orders, and customer management.",
      },
      {
        key: "features.crm.enabled",
        label: "CRM",
        description: "Customer relationship management and pipeline tracking.",
      },
    ],
  },
  {
    label: "Platform",
    description: "Workforce and workflow modules",
    flags: [
      {
        key: "features.hr.enabled",
        label: "HR",
        description: "Employees, departments, and payroll.",
      },
      {
        key: "features.approvals.enabled",
        label: "Approvals",
        description: "Configurable approval workflows for documents.",
      },
    ],
  },
];

// Flat list of all flags for iteration convenience
const ALL_FLAGS = FEATURE_GROUPS.flatMap((g) => g.flags);

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  initialSettings: SettingsResponse;
};

type DraftFlags = Record<string, boolean>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function initialDraft(settings: SettingsResponse): DraftFlags {
  const out: DraftFlags = {};
  for (const flag of ALL_FLAGS) {
    const entry = settings[flag.key];
    out[flag.key] = entry ? Boolean(entry.value) : false;
  }
  return out;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FeaturesSettingsClient({ initialSettings }: Props) {
  const [draft, setDraft] = useState<DraftFlags>(() => initialDraft(initialSettings));
  const [saved, setSaved] = useState<DraftFlags>(() => initialDraft(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = isFormDirty(saved, draft);

  function handleToggle(key: SettingKey, val: boolean) {
    setDraft((prev) => ({ ...prev, [key]: val }));
    setError(null);
  }

  function handleDiscard() {
    setDraft(saved);
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      const updates = (Object.entries(draft) as [SettingKey, boolean][]).filter(
        ([key, val]) => val !== saved[key],
      );

      if (updates.length === 0) return;

      try {
        const idempotencyKey = globalThis.crypto.randomUUID();
        await updateSettings(
          updates.map(([key, value]) => ({ key, value })),
          idempotencyKey,
        );
        setSaved({ ...draft });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save feature settings");
      }
    });
  }

  return (
    <div className="relative">
      {/* ── Feature groups ──────────────────────────────────────────────────── */}
      {FEATURE_GROUPS.map((group, gi) => (
        <section key={group.label} className={`py-6 px-8 ${gi < FEATURE_GROUPS.length - 1 ? "border-b" : ""}`}>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
          </div>

          <div className="space-y-5">
            {group.flags.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor={`feature-${flag.key}`} className="text-sm font-medium cursor-pointer">
                    {flag.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                </div>
                <Switch
                  id={`feature-${flag.key}`}
                  checked={draft[flag.key] ?? false}
                  onCheckedChange={(val) => handleToggle(flag.key, val)}
                  disabled={isPending}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-8 my-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Save bar ────────────────────────────────────────────────────────── */}
      {isDirty && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t bg-background/95 px-8 py-3 backdrop-blur">
          <p className="text-xs text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isPending}
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
