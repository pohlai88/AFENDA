/**
 * relation field kit — linked display name cell, combobox-style widget
 * with search/typeahead support.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import type { FieldKit } from "../types";

export const relationKit: FieldKit<string> = {
  CellRenderer: ({ value }) => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    // Display the raw ID — consumers should enrich with display names
    return <span className="underline decoration-dotted">{value}</span>;
  },
  FormWidget: ({ value, onChange, fieldKey, label, required, readonly, error, description, validation }) => {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Options can be provided via validationJson.options
    const options = (validation?.options as Array<{ value: string; label: string }>) ?? [];
    const filtered = options.filter((o) =>
      o.label.toLowerCase().includes(search.toLowerCase()),
    );

    const selectedLabel = options.find((o) => o.value === value)?.label ?? value ?? "";

    const handleSelect = useCallback(
      (optionValue: string) => {
        onChange(optionValue);
        setSearch("");
        setIsOpen(false);
      },
      [onChange],
    );

    // Close dropdown when clicking outside
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="relative space-y-1">
        <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id={fieldKey}
            type="text"
            value={isOpen ? search : selectedLabel}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!readonly) {
                setIsOpen(true);
                setSearch("");
              }
            }}
            readOnly={readonly}
            placeholder="Search…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm"
            aria-invalid={!!error}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            role="combobox"
            autoComplete="off"
          />
          {/* Clear button */}
          {value && !readonly && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
                setIsOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear selection"
            >
              ×
            </button>
          )}
        </div>
        {/* Dropdown results */}
        {isOpen && !readonly && options.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-input bg-background shadow-md"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matches found
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                  className={[
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                    opt.value === value ? "bg-accent/50 font-medium" : "",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
        {/* Fallback: if no options provided, allow free-text entry */}
        {isOpen && !readonly && options.length === 0 && search && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-input bg-background p-2 shadow-md">
            <button
              type="button"
              onClick={() => handleSelect(search)}
              className="w-full text-left text-sm text-muted-foreground hover:text-foreground"
            >
              Use &ldquo;{search}&rdquo;
            </button>
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
  filterOps: [{ op: "eq", label: "Equals" }],
  exportAdapter: (value) => value ?? "",
};
