"use client";

import { useState } from "react";
import { Button, Input, Label } from "@afenda/ui";
import { Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator } from "../signin/PasswordStrengthIndicator";

interface PasswordFieldProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  showStrength?: boolean;
  minLength?: number;
  required?: boolean;
  placeholder?: string;
}

export function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
  showStrength = false,
  minLength,
  required,
  placeholder,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword((v) => !v)}
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {showStrength && value.length > 0 && <PasswordStrengthIndicator password={value} />}
    </div>
  );
}
