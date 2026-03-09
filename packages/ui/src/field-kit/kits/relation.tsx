"use client";

/**
 * relation field kit — strict single-select entity reference with search.
 *
 * RULES:
 * - Display resolved label; raw ID only as tooltip fallback
 * - No free-text fallback — must select from options
 * - validation.options must be runtime-validated (filter, dedupe)
 * - Readonly renders non-interactive display
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { FieldKit } from "../types";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { Label } from "../../components/label";

type RelationOption = {
  value: string;
  label: string;
};

function normalizeOptions(raw: unknown): RelationOption[] {
  if (!Array.isArray(raw)) return [];

  const valid = raw.filter(
    (item): item is RelationOption =>
      !!item &&
      typeof item === "object" &&
      typeof (item as { value?: unknown }).value === "string" &&
      typeof (item as { label?: unknown }).label === "string",
  );

  const seen = new Set<string>();
  return valid.filter((item) => {
    if (!item.value || seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

export const relationKit: FieldKit<string> = {
  CellRenderer: ({ value, validation }) => {
    if (!value) return <span className="text-muted-foreground">—</span>;

    const options = normalizeOptions(validation?.options);
    const selected = options.find((o) => o.value === value);

    return (
      <span
        className="inline-flex max-w-full truncate underline decoration-dotted"
        title={value}
      >
        {selected?.label ?? value}
      </span>
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
    validation,
  }) => {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const options = useMemo(
      () => normalizeOptions(validation?.options),
      [validation?.options],
    );

    const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return options;
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, search]);

    const selected = options.find((o) => o.value === value);
    const selectedLabel = selected?.label ?? value ?? "";

    const descriptionId = description ? `${fieldKey}-description` : undefined;
    const errorId = error ? `${fieldKey}-error` : undefined;
    const listboxId = `${fieldKey}-listbox`;
    const describedBy =
      [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    const handleSelect = useCallback(
      (optionValue: string) => {
        onChange(optionValue);
        setSearch("");
        setActiveIndex(0);
        setIsOpen(false);
      },
      [onChange],
    );

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        const target = e.target as Node;
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(target) &&
          inputRef.current &&
          !inputRef.current.contains(target)
        ) {
          setIsOpen(false);
          setSearch("");
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
      if (activeIndex >= filtered.length) {
        setActiveIndex(0);
      }
    }, [filtered.length, activeIndex]);

    if (readonly) {
      return (
        <div className="space-y-1">
          <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <div
            id={fieldKey}
            aria-describedby={describedBy}
            className="flex min-h-9 w-full items-center rounded-md border bg-muted/40 px-3 text-sm"
            title={value ?? ""}
          >
            {selectedLabel || (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
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
      <div className="relative space-y-1">
        <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>

        <div className="relative">
          <Input
            ref={inputRef}
            id={fieldKey}
            type="text"
            value={isOpen ? search : selectedLabel}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
                setIsOpen(true);
                return;
              }

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) =>
                  Math.min(i + 1, Math.max(filtered.length - 1, 0)),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                const activeOption = filtered[activeIndex];
                if (isOpen && activeOption) {
                  e.preventDefault();
                  handleSelect(activeOption.value);
                }
              } else if (e.key === "Escape") {
                setIsOpen(false);
                setSearch("");
              }
            }}
            placeholder="Search…"
            className="w-full pr-8"
            aria-invalid={!!error}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={isOpen ? listboxId : undefined}
            aria-describedby={describedBy}
            aria-activedescendant={
              isOpen && filtered[activeIndex] != null
                ? `${fieldKey}-option-${activeIndex}`
                : undefined
            }
            role="combobox"
            autoComplete="off"
          />

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                onChange("");
                setSearch("");
                setActiveIndex(0);
                setIsOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear selection"
            >
              ×
            </Button>
          )}
        </div>

        {isOpen && options.length > 0 && (
          <div
            ref={dropdownRef}
            id={listboxId}
            className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-input bg-background shadow-md"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matches found
              </div>
            ) : (
              filtered.map((opt, index) => (
                <button
                  key={opt.value}
                  id={`${fieldKey}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt.value)}
                  className={[
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                    opt.value === value ? "bg-accent/50 font-medium" : "",
                    index === activeIndex ? "bg-accent" : "",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}

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

  filterOps: [
    { op: "eq", label: "Equals" },
    { op: "ne", label: "Does not equal" },
    { op: "in", label: "In" },
    { op: "isEmpty", label: "Is empty" },
    { op: "isNotEmpty", label: "Is not empty" },
  ],

  exportAdapter: (value) => value ?? "",
};
