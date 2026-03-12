"use client";

import { useState } from "react";
import { Label, Textarea } from "../components";

interface AppShellWorkspaceProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function AppShellWorkspace({
  value,
  defaultValue = "",
  placeholder = "Start typing...",
  onChange,
}: AppShellWorkspaceProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const textareaValue = value ?? internalValue;

  const handleChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <Label className="mb-2 block text-sm font-medium">Working Notes</Label>
      <Textarea
        value={textareaValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-80 w-full resize-y"
      />
    </section>
  );
}
