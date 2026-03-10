"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "@/lib/api-client";
import { Input, Label, Switch, Textarea } from "@afenda/ui";
import type { SettingsResponse, SettingKey } from "@afenda/contracts";
import { SETTINGS_FIELD_UI } from "./settings-ui-config";
import { isFormDirty } from "@/lib/comparison-utils";

// Derive keys from the UI config (web-local) to avoid importing runtime values
// from @afenda/contracts in a client component (Next.js Turbopack limitation).
const SETTING_KEYS = Object.keys(SETTINGS_FIELD_UI) as SettingKey[];

// ── Section key groups ─────────────────────────────────────────────────────────

const UNIT_KEYS: SettingKey[] = [
  "general.units.weightUnit",
  "general.units.volumeUnit",
  "general.units.lengthUnit",
];

const LOCALE_KEYS: SettingKey[] = [
  "general.locale.language",
  "general.locale.timezone",
  "general.locale.dateFormat",
  "general.locale.timeFormat",
  "general.locale.firstDayOfWeek",
  "general.locale.numberFormat",
];

const FINANCIAL_KEYS: SettingKey[] = [
  "general.financial.fiscalYearStartMonth",
  "general.financial.defaultPaymentTermsDays",
  "general.financial.taxInclusive",
  "general.financial.roundingMode",
];

const NOTIFICATION_KEYS: SettingKey[] = [
  "general.notifications.emailOnApproval",
  "general.notifications.emailOnPayment",
  "general.notifications.emailOnOverdue",
];

const EMAIL_KEYS: SettingKey[] = [
  "general.email.buttonText",
  "general.email.buttonColor",
  "general.email.footerText",
];

// Keys whose draft string value must be coerced to a number before sending to the API.
const NUMERIC_KEYS = new Set<SettingKey>([
  "general.financial.fiscalYearStartMonth",
  "general.financial.defaultPaymentTermsDays",
]);

// Keys whose draft string value must be coerced to a boolean before sending.
const BOOLEAN_KEYS = new Set<SettingKey>([
  "general.financial.taxInclusive",
  "general.notifications.emailOnApproval",
  "general.notifications.emailOnPayment",
  "general.notifications.emailOnOverdue",
]);

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  initialSettings: SettingsResponse;
};

type DraftValues = Record<string, string | null>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function initialDraft(settings: SettingsResponse): DraftValues {
  const out: DraftValues = {};
  for (const key of SETTING_KEYS) {
    const entry = settings[key];
    // Numeric values come back as numbers from the API — convert to string for
    // form state, coerced back to number in handleSave.
    out[key] = entry ? String(entry.value) : null;
  }
  return out;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SettingsSection({
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

function SettingsField({
  settingKey,
  value,
  source,
  onChange,
}: {
  settingKey: SettingKey;
  value: string | null;
  source: "default" | "stored" | undefined;
  onChange: (key: SettingKey, val: string | null) => void;
}) {
  const config = SETTINGS_FIELD_UI[settingKey];
  if (!config) return null;

  const inputId = `setting-${settingKey}`;

  return (
    <div className="flex items-start gap-4">
      <Label htmlFor={inputId} className="w-56 pt-1.5 text-sm text-foreground shrink-0">
        {config.label}
        {config.description && (
          <span className="block text-xs text-muted-foreground font-normal">
            {config.description}
          </span>
        )}
      </Label>

      <div className="flex-1">
        {config.controlType === "select" && (
          <select
            id={inputId}
            value={value ?? ""}
            onChange={(e) => onChange(settingKey, e.target.value || null)}
            className="w-full max-w-xs rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {config.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {config.controlType === "text" && (
          <Input
            id={inputId}
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(settingKey, e.target.value || null)}
            className="w-full max-w-xs rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        {config.controlType === "color" && (
          <div className="flex items-center gap-2">
            <Input
              id={inputId}
              type="color"
              value={value ?? "#000000"}
              onChange={(e) => onChange(settingKey, e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-border bg-background p-0.5"
            />
            <Input
              type="text"
              value={value ?? "#000000"}
              onChange={(e) => onChange(settingKey, e.target.value || null)}
              placeholder="#000000"
              className="w-28 rounded border border-border bg-background px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={`${config.label} hex value`}
            />
          </div>
        )}

        {config.controlType === "textarea" && (
          <Textarea
            id={inputId}
            value={value ?? ""}
            rows={3}
            maxLength={500}
            onChange={(e) => onChange(settingKey, e.target.value || null)}
            placeholder="Optional footer text…"
            className="w-full max-w-lg rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        )}

        {config.controlType === "toggle" && (
          <Switch
            id={inputId}
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(settingKey, checked ? "true" : "false")}
          />
        )}

        {source === "default" && value !== null && (
          <p className="mt-1 text-xs text-muted-foreground">System default</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GeneralSettingsClient({ initialSettings }: Props) {
  const [draft, setDraft] = useState<DraftValues>(() => initialDraft(initialSettings));
  const [saved, setSaved] = useState<DraftValues>(() => initialDraft(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = isFormDirty(saved, draft);

  function handleChange(key: SettingKey, val: string | null) {
    setDraft((prev) => ({ ...prev, [key]: val }));
    setError(null);
  }

  function handleDiscard() {
    setDraft(saved);
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      const updates = Object.entries(draft)
        .filter(([key, val]) => val !== saved[key])
        .map(([key, value]) => {
          const k = key as SettingKey;
          if (value !== null && NUMERIC_KEYS.has(k)) return { key: k, value: Number(value) };
          if (value !== null && BOOLEAN_KEYS.has(k)) return { key: k, value: value === "true" };
          return { key: k, value };
        });

      if (updates.length === 0) return;

      try {
        const idempotencyKey = globalThis.crypto.randomUUID();
        await updateSettings(updates, idempotencyKey);
        setSaved({ ...draft });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save settings");
      }
    });
  }

  const sourceFor = (key: SettingKey) => initialSettings[key]?.source;

  return (
    <div className="relative">
      {/* ── Localization ────────────────────────────────────────────────────── */}
      <SettingsSection
        title="Localization"
        description="Language, timezone, and regional display preferences for this organisation"
      >
        {LOCALE_KEYS.map((key) => (
          <SettingsField
            key={key}
            settingKey={key}
            value={draft[key] ?? null}
            source={sourceFor(key)}
            onChange={handleChange}
          />
        ))}
      </SettingsSection>

      {/* ── Units ──────────────────────────────────────────────────────────── */}
      <SettingsSection title="Units" description="Measurement units used across the platform">
        {UNIT_KEYS.map((key) => (
          <SettingsField
            key={key}
            settingKey={key}
            value={draft[key] ?? null}
            source={sourceFor(key)}
            onChange={handleChange}
          />
        ))}
      </SettingsSection>

      {/* ── Financial ───────────────────────────────────────────────────────── */}
      <SettingsSection
        title="Financial Defaults"
        description="Organisation-wide fiscal, tax, and transaction defaults"
      >
        {FINANCIAL_KEYS.map((key) => (
          <SettingsField
            key={key}
            settingKey={key}
            value={draft[key] ?? null}
            source={sourceFor(key)}
            onChange={handleChange}
          />
        ))}
      </SettingsSection>

      {/* ── Notification Preferences ────────────────────────────────────────── */}
      <SettingsSection
        title="Notification Preferences"
        description="Organisation-wide default email notifications for key events"
      >
        {NOTIFICATION_KEYS.map((key) => (
          <SettingsField
            key={key}
            settingKey={key}
            value={draft[key] ?? null}
            source={sourceFor(key)}
            onChange={handleChange}
          />
        ))}
      </SettingsSection>

      {/* ── Email Branding ───────────────────────────────────────────────────── */}
      <SettingsSection
        title="Email Branding"
        description="Customise outgoing email appearance"
      >
        {EMAIL_KEYS.map((key) => (
          <SettingsField
            key={key}
            settingKey={key}
            value={draft[key] ?? null}
            source={sourceFor(key)}
            onChange={handleChange}
          />
        ))}
      </SettingsSection>

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
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-100 disabled:opacity-50"
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
