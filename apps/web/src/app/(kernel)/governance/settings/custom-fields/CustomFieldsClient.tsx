"use client";

import { useState, useTransition } from "react";
import {
  createCustomFieldDef,
  updateCustomFieldDef,
  deleteCustomFieldDef,
  fetchCustomFieldDefs,
} from "@/lib/api-client";
import type { CustomFieldDefResponse } from "@afenda/contracts";
import { Checkbox, Input, Label } from "@afenda/ui";

// Local constants — avoid importing as-const arrays as runtime values from @afenda/contracts
// in client components (Turbopack bundling constraint).
const ENTITY_TYPE_VALUES = ["supplier", "invoice", "purchase_order"] as const;
const DATA_TYPE_VALUES = ["text", "number", "date", "dropdown", "checkbox"] as const;
type EntityTypeValue = (typeof ENTITY_TYPE_VALUES)[number];
type DataTypeValue = (typeof DATA_TYPE_VALUES)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  initialDefs: CustomFieldDefResponse[];
}

type FormState = "idle" | "creating" | "editing";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS: Record<string, string> = {
  supplier: "Supplier",
  invoice: "Invoice",
  purchase_order: "Purchase Order",
};

const DATA_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  checkbox: "Checkbox (Yes/No)",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomFieldsClient({ initialDefs }: Props) {
  const [defs, setDefs] = useState<CustomFieldDefResponse[]>(initialDefs);
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // New field form state
  const [entityType, setEntityType] = useState<EntityTypeValue>("supplier");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [dataType, setDataType] = useState<DataTypeValue>("text");
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [showInPdf, setShowInPdf] = useState(false);

  // Auto-generate api_key from label
  function handleLabelChange(value: string) {
    setLabel(value);
    if (formState === "creating") {
      setApiKey(
        value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9_\s]/g, "")
          .replace(/\s+/g, "_")
          .replace(/^[^a-z]/, "")
          .substring(0, 63),
      );
    }
  }

  function resetForm() {
    setLabel("");
    setApiKey("");
    setDataType("text");
    setRequired(false);
    setHelpText("");
    setSortOrder(0);
    setShowInPdf(false);
    setEntityType("supplier");
    setError(null);
    setFormState("idle");
  }

  async function refreshDefs() {
    const { data } = await fetchCustomFieldDefs(undefined, true);
    setDefs(data);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!label.trim()) { setError("Label is required"); return; }
    if (!apiKey.match(/^[a-z][a-z0-9_]{0,62}$/)) {
      setError("api_key must be a lowercase slug starting with a letter (e.g. ref_code)");
      return;
    }

    startTransition(async () => {
      try {
        await createCustomFieldDef({
          entityType,
          label,
          apiKey,
          dataType,
          required,
          helpText: helpText.trim() || undefined,
          sortOrder,
          showInPdf,
        });
        await refreshDefs();
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create field");
      }
    });
  }

  async function handleToggleActive(def: CustomFieldDefResponse) {
    startTransition(async () => {
      try {
        await updateCustomFieldDef(def.id, { active: !def.active });
        await refreshDefs();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update field");
      }
    });
  }

  async function handleDelete(def: CustomFieldDefResponse) {
    if (!confirm(`Delete custom field "${def.label}"? If values exist it will be deactivated instead.`)) return;
    startTransition(async () => {
      try {
        await deleteCustomFieldDef(def.id);
        await refreshDefs();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete field");
      }
    });
  }

  // Group defs by entity type
  const byEntityType = defs.reduce<Record<string, CustomFieldDefResponse[]>>(
    (acc, def) => {
      if (!acc[def.entityType]) acc[def.entityType] = [];
      acc[def.entityType]!.push(def);
      return acc;
    },
    {},
  );

  return (
    <div className="p-8 max-w-4xl">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Custom Fields</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define additional fields for entity types. Fields can be added to Suppliers,
            Invoices, and Purchase Orders.{" "}
            <span className="text-xs text-muted-foreground/70">
              Phase 3: capture and display only — search/filter/export in Phase 4.
            </span>
          </p>
        </div>
        {formState === "idle" && (
          <button
            onClick={() => setFormState("creating")}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Field
          </button>
        )}
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {formState === "creating" && (
        <form
          onSubmit={handleCreate}
          className="mb-8 rounded-lg border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold">New Custom Field</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-xs font-medium text-muted-foreground mb-1">
                Entity Type *
              </Label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as EntityTypeValue)}
                className="w-full rounded border px-3 py-1.5 text-sm bg-background"
              >
                {ENTITY_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>{ENTITY_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="block text-xs font-medium text-muted-foreground mb-1">
                Data Type *
              </Label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value as DataTypeValue)}
                className="w-full rounded border px-3 py-1.5 text-sm bg-background"
              >
                {DATA_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>{DATA_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="block text-xs font-medium text-muted-foreground mb-1">
                Label *
              </Label>
              <Input
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. Reference Code"
                className="w-full rounded border px-3 py-1.5 text-sm bg-background"
                required
              />
            </div>

            <div>
              <Label className="block text-xs font-medium text-muted-foreground mb-1">
                API Key *{" "}
                <span className="text-xs font-normal text-muted-foreground/70">(immutable after creation)</span>
              </Label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="ref_code"
                pattern="^[a-z][a-z0-9_]{0,62}$"
                className="w-full rounded border px-3 py-1.5 text-sm font-mono bg-background"
                required
              />
            </div>

            <div>
              <Label className="block text-xs font-medium text-muted-foreground mb-1">
                Help Text
              </Label>
              <Input
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                placeholder="Optional guidance for this field"
                className="w-full rounded border px-3 py-1.5 text-sm bg-background"
              />
            </div>

            <div>
              <Label className="block text-xs font-medium text-muted-foreground mb-1">
                Sort Order
              </Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                className="w-full rounded border px-3 py-1.5 text-sm bg-background"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="field-required"
                checked={required}
                onCheckedChange={(checked) => setRequired(checked === true)}
              />
              <Label htmlFor="field-required" className="text-sm cursor-pointer">
                Required{" "}
                <span className="text-xs text-muted-foreground">(prospective — not enforced on existing records)</span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="field-show-pdf"
                checked={showInPdf}
                onCheckedChange={(checked) => setShowInPdf(checked === true)}
              />
              <Label htmlFor="field-show-pdf" className="text-sm cursor-pointer">
                Show in PDF{" "}
                <span className="text-xs text-muted-foreground">(Phase 5+)</span>
              </Label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create Field"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Definitions list ──────────────────────────────────────────────── */}
      {Object.keys(byEntityType).length === 0 && formState === "idle" ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-sm">No custom fields defined yet.</p>
          <p className="mt-1 text-xs">Add a field to extend entity data for your org.</p>
        </div>
      ) : (
        Object.entries(byEntityType).map(([type, fields]) => (
          <div key={type} className="mb-6">
            <h2 className="mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {ENTITY_TYPE_LABELS[type] ?? type}
            </h2>
            <div className="rounded-lg border divide-y">
              {fields.map((def) => (
                <div
                  key={def.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    !def.active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{def.label}</span>
                      {!def.active && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          inactive
                        </span>
                      )}
                      {def.required && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                          required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code className="rounded bg-muted px-1">{def.apiKey}</code>
                      <span>·</span>
                      <span>{DATA_TYPE_LABELS[def.dataType] ?? def.dataType}</span>
                      {def.helpText && (
                        <>
                          <span>·</span>
                          <span className="italic">{def.helpText}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(def)}
                      disabled={isPending}
                      className="rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      {def.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(def)}
                      disabled={isPending}
                      className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
