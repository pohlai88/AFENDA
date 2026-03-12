"use client";

import { Check, X } from "lucide-react";

interface PasswordRequirement {
  label: string;
  satisfied: boolean;
}

interface PasswordHintProps {
  password: string;
}

export function PasswordHint({ password }: PasswordHintProps) {
  const requirements: PasswordRequirement[] = [
    {
      label: "At least 8 characters",
      satisfied: password.length >= 8,
    },
    {
      label: "Contains uppercase letter (A-Z)",
      satisfied: /[A-Z]/.test(password),
    },
    {
      label: "Contains lowercase letter (a-z)",
      satisfied: /[a-z]/.test(password),
    },
    {
      label: "Contains number (0-9)",
      satisfied: /[0-9]/.test(password),
    },
    {
      label: "Contains special character (!@#$%^&*)",
      satisfied: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  if (!password) return null;

  const allSatisfied = requirements.every((req) => req.satisfied);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        Password requirements:
      </div>
      <ul className="space-y-1">
        {requirements.map((req, idx) => (
          <li
            key={idx}
            className={`flex items-center gap-2 text-xs ${req.satisfied ? "text-primary" : "text-muted-foreground"}`}
          >
            {req.satisfied ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 flex-shrink-0" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
      {allSatisfied && (
        <div className="mt-2 text-xs font-medium text-primary">
          ✓ Password is strong
        </div>
      )}
    </div>
  );
}
