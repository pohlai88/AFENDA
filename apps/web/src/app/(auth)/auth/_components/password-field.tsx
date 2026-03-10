"use client";

import { useState } from "react";
import { Input, Label, Button } from "@afenda/ui";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  minLength?: number;
  showStrength?: boolean;
}

function getStrengthScore(value: string, minLength: number): number {
  if (value.length === 0) return 0;
  if (value.length < minLength) return 1;
  if (value.match(/[A-Z]/) && value.match(/[0-9]/)) return 3;
  return 2;
}

function getStrengthBarClass(score: number): string {
  const classes = ["bg-muted", "bg-destructive", "bg-warning", "bg-success"];
  return classes[score] ?? "bg-muted";
}

function getStrengthWidthClass(score: number): string {
  const widths = ["w-0", "w-1/3", "w-2/3", "w-full"];
  return widths[score] ?? "w-0";
}

function getStrengthMessage(score: number): string {
  const messages = ["", "Too short", "Could be stronger", "Strong password"];
  return messages[score] ?? "";
}

export function PasswordField({
  id = "password",
  name = "password",
  label = "Password",
  value = "",
  onChange,
  required = false,
  disabled = false,
  autoComplete = "current-password",
  minLength = 8,
  showStrength = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const strengthScore = getStrengthScore(value, minLength);

  return (
    <div className="flex flex-col form-gap">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          minLength={minLength}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="flex flex-col form-gap mt-2">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-300 ease-in-out ${getStrengthBarClass(strengthScore)} ${getStrengthWidthClass(strengthScore)}`}
            />
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {getStrengthMessage(strengthScore)}
          </p>
        </div>
      )}
    </div>
  );
}
