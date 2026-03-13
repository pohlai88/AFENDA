"use client";

import { useMemo, useState, useTransition } from "react";
import { updateSettings } from "@/lib/api-client";
import { isFormDirty } from "@/lib/comparison-utils";
import { Button, Input, Label, Textarea } from "@afenda/ui";
import type { SettingsResponse, SettingKey } from "@afenda/contracts";

type Props = {
  initialSettings: SettingsResponse;
};

type StorageDraft = {
  maxUploadBytes: string;
  allowedMimeTypes: string;
  retentionDays: string;
};

const STORAGE_KEYS: Record<keyof StorageDraft, SettingKey> = {
  maxUploadBytes: "general.storage.maxUploadBytes",
  allowedMimeTypes: "general.storage.allowedMimeTypes",
  retentionDays: "general.storage.retentionDays",
};

function initialDraft(settings: SettingsResponse): StorageDraft {
  return {
    maxUploadBytes: String(settings[STORAGE_KEYS.maxUploadBytes]?.value ?? 10485760),
    allowedMimeTypes: String(
      settings[STORAGE_KEYS.allowedMimeTypes]?.value ??
        "application/pdf,image/png,image/jpeg,image/webp,text/plain",
    ),
    retentionDays: String(settings[STORAGE_KEYS.retentionDays]?.value ?? 365),
  };
}

function toPrettyMb(bytesText: string): string {
  const bytes = Number(bytesText);
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function StorageSettingsClient({ initialSettings }: Props) {
  const [draft, setDraft] = useState<StorageDraft>(() => initialDraft(initialSettings));
  const [saved, setSaved] = useState<StorageDraft>(() => initialDraft(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = isFormDirty(saved, draft);
  const maxUploadPreview = useMemo(() => toPrettyMb(draft.maxUploadBytes), [draft.maxUploadBytes]);

  function setField<K extends keyof StorageDraft>(key: K, value: StorageDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function handleDiscard() {
    setDraft(saved);
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      const maxUploadBytes = Number(draft.maxUploadBytes);
      const retentionDays = Number(draft.retentionDays);

      if (!Number.isInteger(maxUploadBytes) || maxUploadBytes <= 0) {
        setError("Max upload bytes must be a positive integer.");
        return;
      }

      if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
        setError("Retention days must be a positive integer.");
        return;
      }

      const updates = [
        { key: STORAGE_KEYS.maxUploadBytes, value: maxUploadBytes },
        { key: STORAGE_KEYS.allowedMimeTypes, value: draft.allowedMimeTypes.trim() },
        { key: STORAGE_KEYS.retentionDays, value: retentionDays },
      ].filter((entry) => {
        const draftValue = entry.value;
        const currentValue =
          entry.key === STORAGE_KEYS.maxUploadBytes
            ? Number(saved.maxUploadBytes)
            : entry.key === STORAGE_KEYS.retentionDays
              ? Number(saved.retentionDays)
              : saved.allowedMimeTypes;
        return draftValue !== currentValue;
      });

      if (updates.length === 0) return;

      try {
        await updateSettings(updates, globalThis.crypto.randomUUID());
        setSaved({ ...draft });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save storage policy settings");
      }
    });
  }

  return (
    <div className="relative">
      <section className="px-8 py-6">
        <div className="grid max-w-3xl gap-5">
          <div className="space-y-2">
            <Label htmlFor="storage-max-upload">Max Upload Size (bytes)</Label>
            <Input
              id="storage-max-upload"
              inputMode="numeric"
              value={draft.maxUploadBytes}
              onChange={(event) => setField("maxUploadBytes", event.target.value)}
              aria-describedby="storage-max-upload-help"
            />
            <p id="storage-max-upload-help" className="text-xs text-muted-foreground">
              Server-side enforced at presign/register. Current approx: {maxUploadPreview}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-mime-list">Allowed MIME Types (comma-separated)</Label>
            <Textarea
              id="storage-mime-list"
              rows={4}
              value={draft.allowedMimeTypes}
              onChange={(event) => setField("allowedMimeTypes", event.target.value)}
              aria-describedby="storage-mime-list-help"
            />
            <p id="storage-mime-list-help" className="text-xs text-muted-foreground">
              Example: application/pdf,image/png,image/jpeg
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-retention-days">Retention Days</Label>
            <Input
              id="storage-retention-days"
              inputMode="numeric"
              value={draft.retentionDays}
              onChange={(event) => setField("retentionDays", event.target.value)}
              aria-describedby="storage-retention-days-help"
            />
            <p id="storage-retention-days-help" className="text-xs text-muted-foreground">
              Used to stamp document retention metadata when files are registered.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mx-8 my-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isDirty ? (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t bg-background/95 px-8 py-3 backdrop-blur">
          <p className="text-xs text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleDiscard} disabled={isPending}>
              Discard
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
