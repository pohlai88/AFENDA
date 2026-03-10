"use client";

import { useState, useTransition } from "react";
import { updateOrganization, updateSettings } from "@/lib/api-client";
import type { SettingsResponse, SettingKey } from "@afenda/contracts";
import type { OrgProfileResponse } from "@afenda/contracts";
import { SETTINGS_FIELD_UI } from "../settings-ui-config";
import { Input, Label } from "@afenda/ui";
import { isFormDirty } from "@/lib/comparison-utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  initialOrg: OrgProfileResponse;
  initialSettings: SettingsResponse;
};

// Company settings keys rendered on this page
const COMPANY_SETTING_KEYS: SettingKey[] = [
  "general.company.legalName",
  "general.company.tradingName",
  "general.company.taxId",
  "general.company.phone",
  "general.company.website",
  "general.company.industry",
  "general.company.address.street",
  "general.company.address.city",
  "general.company.address.state",
  "general.company.address.postalCode",
  "general.company.address.country",
];

const PROFILE_KEYS: SettingKey[] = [
  "general.company.legalName",
  "general.company.tradingName",
  "general.company.taxId",
  "general.company.phone",
  "general.company.website",
  "general.company.industry",
];

const ADDRESS_KEYS: SettingKey[] = [
  "general.company.address.street",
  "general.company.address.city",
  "general.company.address.state",
  "general.company.address.postalCode",
  "general.company.address.country",
];

type OrgDraft = { name: string; functionalCurrency: string };
type SettingsDraft = Record<string, string | null>;

function initialSettingsDraft(settings: SettingsResponse): SettingsDraft {
  const out: SettingsDraft = {};
  for (const key of COMPANY_SETTING_KEYS) {
    const entry = settings[key];
    out[key] = entry ? String(entry.value ?? "") : "";
  }
  return out;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-6 px-8 border-b last:border-b-0">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  description,
  children,
  id,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <Label htmlFor={id} className="w-56 pt-1.5 text-sm text-foreground shrink-0">
        {label}
        {description && (
          <span className="block text-xs text-muted-foreground font-normal">{description}</span>
        )}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  readOnly,
  placeholder,
  maxLength,
}: {
  id: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Input
      id={id}
      type="text"
      value={value}
      onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`w-full max-w-xs rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${readOnly ? "opacity-60 cursor-default" : ""}`}
    />
  );
}

function SelectInput({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-xs rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">— Select —</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ── Setting field renderer using the shared UI config ──────────────────────────

function SettingField({
  settingKey,
  value,
  onChange,
}: {
  settingKey: SettingKey;
  value: string | null;
  onChange: (key: SettingKey, val: string | null) => void;
}) {
  const config = SETTINGS_FIELD_UI[settingKey];
  if (!config) return null;
  const id = `company-${settingKey}`;

  if (config.controlType === "select" && config.options) {
    return (
      <Field label={config.label} description={config.description} id={id}>
        <SelectInput
          id={id}
          value={value ?? ""}
          onChange={(v) => onChange(settingKey, v || null)}
          options={config.options}
        />
      </Field>
    );
  }

  return (
    <Field label={config.label} description={config.description} id={id}>
      <TextInput
        id={id}
        value={value ?? ""}
        onChange={(v) => onChange(settingKey, v || null)}
        placeholder={config.label}
      />
    </Field>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CompanySettingsClient({ initialOrg, initialSettings }: Props) {
  const [orgDraft, setOrgDraft] = useState<OrgDraft>({
    name: initialOrg.name,
    functionalCurrency: initialOrg.functionalCurrency,
  });
  const [orgSaved, setOrgSaved] = useState<OrgDraft>({
    name: initialOrg.name,
    functionalCurrency: initialOrg.functionalCurrency,
  });

  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() =>
    initialSettingsDraft(initialSettings),
  );
  const [settingsSaved, setSettingsSaved] = useState<SettingsDraft>(() =>
    initialSettingsDraft(initialSettings),
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOrgDirty = isFormDirty(orgSaved, orgDraft);
  const isSettingsDirty = isFormDirty(settingsSaved, settingsDraft);
  const isDirty = isOrgDirty || isSettingsDirty;

  function handleSettingChange(key: SettingKey, val: string | null) {
    setSettingsDraft((prev) => ({ ...prev, [key]: val }));
    setError(null);
  }

  function handleDiscard() {
    setOrgDraft(orgSaved);
    setSettingsDraft(settingsSaved);
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      const idempotencyKey = globalThis.crypto.randomUUID();
      const promises: Promise<unknown>[] = [];

      if (isOrgDirty) {
        const orgUpdates: { name?: string; functionalCurrency?: string } = {};
        if (orgDraft.name !== orgSaved.name) orgUpdates.name = orgDraft.name;
        if (orgDraft.functionalCurrency !== orgSaved.functionalCurrency)
          orgUpdates.functionalCurrency = orgDraft.functionalCurrency;
        if (Object.keys(orgUpdates).length > 0) {
          promises.push(updateOrganization({ idempotencyKey, ...orgUpdates }));
        }
      }

      if (isSettingsDirty) {
        const updates = Object.entries(settingsDraft)
          .filter(([key, val]) => val !== settingsSaved[key])
          .map(([key, value]) => ({ key: key as SettingKey, value }));
        if (updates.length > 0) {
          promises.push(updateSettings(updates, globalThis.crypto.randomUUID()));
        }
      }

      if (promises.length === 0) return;

      try {
        await Promise.all(promises);
        setOrgSaved({ ...orgDraft });
        setSettingsSaved({ ...settingsDraft });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save company settings");
      }
    });
  }

  return (
    <div className="relative">
      {/* ── Organisation ────────────────────────────────────────────────────── */}
      <Section
        title="Organisation"
        description="Core identity fields. Display name and base currency are stored on the organisation record."
      >
        <Field label="Display Name" description="Name shown across the application" id="org-name">
          <TextInput
            id="org-name"
            value={orgDraft.name}
            onChange={(v) => { setOrgDraft((p) => ({ ...p, name: v })); setError(null); }}
            placeholder="Organisation name"
            maxLength={200}
          />
        </Field>
        <Field
          label="Base Currency"
          description="ISO 4217 3-letter currency code (e.g. USD, GBP, EUR)"
          id="org-currency"
        >
          <TextInput
            id="org-currency"
            value={orgDraft.functionalCurrency}
            onChange={(v) => {
              setOrgDraft((p) => ({ ...p, functionalCurrency: v.toUpperCase().slice(0, 3) }));
              setError(null);
            }}
            placeholder="USD"
            maxLength={3}
          />
        </Field>
        <Field label="Slug" description="URL identifier — immutable after creation" id="org-slug">
          <TextInput id="org-slug" value={initialOrg.slug} readOnly />
        </Field>
      </Section>

      {/* ── Company Profile ──────────────────────────────────────────────────── */}
      <Section
        title="Company Profile"
        description="Legal and contact details used on documents and communications"
      >
        {PROFILE_KEYS.map((key) => (
          <SettingField
            key={key}
            settingKey={key}
            value={settingsDraft[key] ?? null}
            onChange={handleSettingChange}
          />
        ))}
      </Section>

      {/* ── Address ─────────────────────────────────────────────────────────── */}
      <Section
        title="Address"
        description="Registered or primary business address"
      >
        {ADDRESS_KEYS.map((key) => (
          <SettingField
            key={key}
            settingKey={key}
            value={settingsDraft[key] ?? null}
            onChange={handleSettingChange}
          />
        ))}
      </Section>

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
