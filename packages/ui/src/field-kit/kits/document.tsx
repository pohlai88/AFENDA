"use client";

/**
 * document field kit — persisted DocumentRef field with upload adapter.
 *
 * RULES:
 * - Canonical value is a persisted DocumentRef or null
 * - Raw browser File is transient UI input only
 * - Widget must upload/register first, then emit DocumentRef
 * - Never store only file.name as business value
 */
import { useCallback, useRef, useState, type DragEvent } from "react";
import type { DocumentRef } from "@afenda/contracts";
import type { FieldKit } from "../types";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

export type { DocumentRef };

export interface UploadDocumentParams {
  file: File;
  fieldKey: string;
}

export interface UploadDocumentResult extends DocumentRef {}

export interface RemoveDocumentParams {
  value: DocumentRef;
  fieldKey: string;
}

export interface DocumentUploadAdapter {
  upload(params: UploadDocumentParams): Promise<UploadDocumentResult>;
  remove?(params: RemoveDocumentParams): Promise<void>;
}

export interface DocumentFieldMeta {
  uploadAdapter: DocumentUploadAdapter;
  acceptedMimeTypes?: string[];
  maxSizeBytes?: number;
  allowReplace?: boolean;
  allowRemove?: boolean;
}

type DocumentFieldValue = DocumentRef | null;

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "error"; message: string };

function formatBytes(sizeBytes?: number): string {
  if (sizeBytes == null || !Number.isFinite(sizeBytes)) return "—";

  const units = ["B", "KB", "MB", "GB"];
  let value = sizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function validateFile(file: File, meta: DocumentFieldMeta): string | null {
  if (
    meta.acceptedMimeTypes &&
    meta.acceptedMimeTypes.length > 0 &&
    !meta.acceptedMimeTypes.includes(file.type)
  ) {
    return "File type is not allowed.";
  }

  if (typeof meta.maxSizeBytes === "number" && file.size > meta.maxSizeBytes) {
    return `File is too large. Maximum allowed is ${formatBytes(meta.maxSizeBytes)}.`;
  }

  return null;
}

function isDocumentRef(value: unknown): value is DocumentRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "documentId" in value &&
    "fileName" in value &&
    "mime" in value &&
    "sizeBytes" in value &&
    "status" in value
  );
}

/** Legacy: extract filename from string value for backward compatibility. */
function getLegacyFileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.split("/").pop() ?? value;
}

interface DocumentKitFactoryOptions {
  getMeta: (fieldKey: string) => DocumentFieldMeta;
}

export function createDocumentKit(
  options: DocumentKitFactoryOptions,
): FieldKit<DocumentFieldValue> {
  return {
    CellRenderer: ({ value }) => {
      if (!value) {
        return <span className="text-muted-foreground">—</span>;
      }

      // Legacy: handle string (filename) for backward compatibility
      const legacyName = getLegacyFileName(value);
      if (legacyName) {
        return (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">📄</span>
            <span className="max-w-55 truncate underline decoration-dotted">{legacyName}</span>
          </span>
        );
      }

      if (!isDocumentRef(value)) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <span className="inline-flex items-center gap-1.5 text-sm" title={value.fileName}>
          <span className="text-muted-foreground">📄</span>
          <span className="max-w-55 truncate underline decoration-dotted">{value.fileName}</span>
        </span>
      );
    },

    FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description }) => {
      const meta = options.getMeta(fieldKey);
      const inputRef = useRef<HTMLInputElement>(null);
      const [isDragging, setIsDragging] = useState(false);
      const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });

      const docRef = value && isDocumentRef(value) ? value : null;
      const legacyFileName = getLegacyFileName(value);

      const handleFile = useCallback(
        async (file: File) => {
          const validationError = validateFile(file, meta);
          if (validationError) {
            setUploadState({ kind: "error", message: validationError });
            if (inputRef.current) inputRef.current.value = "";
            return;
          }

          try {
            setUploadState({ kind: "uploading", fileName: file.name });

            const uploaded = await meta.uploadAdapter.upload({
              file,
              fieldKey,
            });

            onChange(uploaded);
            setUploadState({ kind: "idle" });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed.";
            setUploadState({ kind: "error", message });
          } finally {
            if (inputRef.current) inputRef.current.value = "";
          }
        },
        [fieldKey, meta, onChange],
      );

      const handleRemove = useCallback(async () => {
        if (!docRef && !legacyFileName) return;

        try {
          if (docRef && meta.uploadAdapter.remove) {
            await meta.uploadAdapter.remove({ value: docRef, fieldKey });
          }
          onChange(null);
          setUploadState({ kind: "idle" });
          if (inputRef.current) inputRef.current.value = "";
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unable to remove file.";
          setUploadState({ kind: "error", message });
        }
      }, [fieldKey, meta, onChange, docRef, legacyFileName]);

      const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }, []);

      const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }, []);

      const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);

          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        },
        [handleFile],
      );

      if (readonly) {
        return (
          <div className="space-y-1">
            <Label className="text-sm font-medium text-foreground">
              {label}
              {required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>

            <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
              {docRef ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📄</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{docRef.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {docRef.mime} · {formatBytes(docRef.sizeBytes)}
                    </div>
                  </div>
                </div>
              ) : legacyFileName ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📄</span>
                  <div className="truncate font-medium">{legacyFileName}</div>
                </div>
              ) : (
                "—"
              )}
            </div>

            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        );
      }

      const hasDocument = !!docRef || !!legacyFileName;
      const canRemove = hasDocument && meta.allowRemove !== false;
      const canReplace = meta.allowReplace !== false;

      return (
        <div className="space-y-1">
          <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>

          {hasDocument ? (
            <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">📄</span>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{docRef?.fileName ?? legacyFileName}</div>
                  {docRef && (
                    <div className="text-xs text-muted-foreground">
                      {docRef.mime} · {formatBytes(docRef.sizeBytes)} · {docRef.status}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {docRef?.url && (
                    <Button type="button" variant="ghost" size="sm" asChild>
                      <a href={docRef?.url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </Button>
                  )}

                  {canReplace && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => inputRef.current?.click()}
                    >
                      Replace
                    </Button>
                  )}

                  {canRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemove()}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className={[
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-input hover:border-primary/50 hover:bg-muted/30",
                error && "border-destructive",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? `${fieldKey}-error`
                  : uploadState.kind === "error"
                    ? `${fieldKey}-upload-error`
                    : description
                      ? `${fieldKey}-description`
                      : undefined
              }
              aria-label="Drop file here or click to browse"
            >
              <span className="mb-1 text-2xl text-muted-foreground">
                {isDragging ? "📥" : "📎"}
              </span>
              <p className="text-sm text-muted-foreground">
                {isDragging ? "Drop file here" : "Drag and drop a file, or click to browse"}
              </p>
            </div>
          )}

          <Input
            ref={inputRef}
            id={fieldKey}
            type="file"
            className="sr-only"
            aria-hidden={true}
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {uploadState.kind === "uploading" && (
            <p className="text-xs text-muted-foreground">Uploading {uploadState.fileName}...</p>
          )}

          {description && uploadState.kind !== "error" && !error && (
            <p id={`${fieldKey}-description`} className="text-xs text-muted-foreground">
              {description}
            </p>
          )}

          {uploadState.kind === "error" && (
            <p id={`${fieldKey}-upload-error`} className="text-xs text-destructive">
              {uploadState.message}
            </p>
          )}

          {error && (
            <p id={`${fieldKey}-error`} className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      );
    },

    filterOps: [],

    exportAdapter: (value) => (value && isDocumentRef(value) ? value.fileName : ""),
  };
}

/** Default upload adapter that throws — use until app registers a real adapter. */
const defaultUploadAdapter: DocumentUploadAdapter = {
  async upload() {
    throw new Error(
      "Document upload adapter not configured. Call registerDocumentKit(createDocumentKit({ getMeta: ... })) at app startup.",
    );
  },
};

const defaultDocumentMeta: DocumentFieldMeta = {
  uploadAdapter: defaultUploadAdapter,
  allowReplace: true,
  allowRemove: true,
};

/** Default document kit for registry — throws on upload until app registers a real kit. */
export const documentKit = createDocumentKit({
  getMeta: () => defaultDocumentMeta,
});
