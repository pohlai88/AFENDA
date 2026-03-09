/**
 * json field kit — code block cell, Textarea widget.
 *
 * RULES:
 * - Value stays as string during editing; no parse-on-keystroke
 * - stringifyJson safely handles null, undefined, and non-JSON-safe values
 * - Readonly renders formatted <pre>, not editable-looking Textarea
 * - exportAdapter wraps JSON.stringify in try/catch
 */
import type { FieldKit } from "../types";
import { Label } from "../../components/label";
import { Textarea } from "../../components/textarea";

function stringifyJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return "";
  }
}

export const jsonKit: FieldKit<unknown> = {
  CellRenderer: ({ value }) => {
    if (value == null) return <span className="text-muted-foreground">—</span>;

    const text = stringifyJson(value);
    const truncated = text.length > 60 ? `${text.slice(0, 57)}…` : text;

    return (
      <code
        className="inline-block max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
        title={text}
      >
        {truncated}
      </code>
    );
  },

  FormWidget: ({
    value,
    onChange,
    fieldKey,
    label,
    required,
    readonly,
    error,
    description,
  }) => {
    const text = stringifyJson(value);
    const descriptionId = description ? `${fieldKey}-description` : undefined;
    const errorId = error ? `${fieldKey}-error` : undefined;
    const describedBy =
      [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    if (readonly) {
      return (
        <div className="space-y-1">
          <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <pre
            id={fieldKey}
            aria-describedby={describedBy}
            className="max-h-64 overflow-auto rounded-md border bg-muted/40 px-3 py-2 text-xs font-mono"
          >
            {text || "—"}
          </pre>
          {description && (
            <p id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
          {error && (
            <p id={errorId} className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        <Textarea
          id={fieldKey}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="w-full font-mono text-sm"
          aria-invalid={!!error}
          aria-describedby={describedBy}
          spellCheck={false}
        />
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },

  filterOps: [],

  exportAdapter: (value) => {
    if (value == null) return "";
    try {
      return typeof value === "string" ? value : JSON.stringify(value);
    } catch {
      return "";
    }
  },
};
