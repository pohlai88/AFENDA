/**
 * document field kit — file icon + name cell, drag-and-drop upload widget
 * with preview and progress indication.
 */
import { useState, useCallback, useRef, type DragEvent } from "react";
import type { FieldKit } from "../types";

export const documentKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    const filename = value.split("/").pop() ?? value;
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">📄</span>
        <span className="underline decoration-dotted">{filename}</span>
      </span>
    );
  },
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(
      (file: File) => {
        onChange(file.name);
      },
      [onChange],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      },
      [handleFile],
    );

    return (
      <div className="space-y-1">
        <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>

        {/* Current file preview */}
        {value && (
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
            <span>📄</span>
            <span className="flex-1 truncate">{value}</span>
            {!readonly && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove file"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Drop zone */}
        {!readonly && !value && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-input hover:border-primary/50 hover:bg-muted/30",
            ].join(" ")}
            role="button"
            tabIndex={0}
            aria-label="Drop file here or click to browse"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <span className="text-2xl text-muted-foreground mb-1">
              {isDragging ? "📥" : "📎"}
            </span>
            <p className="text-sm text-muted-foreground">
              {isDragging
                ? "Drop file here"
                : "Drag and drop a file, or click to browse"}
            </p>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          id={fieldKey}
          type="file"
          disabled={readonly}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="sr-only"
          aria-invalid={!!error}
        />

        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
  filterOps: [],
  exportAdapter: (value) => value ?? "",
};
