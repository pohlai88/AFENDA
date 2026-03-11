"use client";

interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  if (!password) return null;

  // Calculate strength score
  let strength = 0;
  const strengthChecks = [
    { test: password.length >= 8, weight: 20 },
    { test: password.length >= 12, weight: 10 },
    { test: /[a-z]/.test(password), weight: 15 },
    { test: /[A-Z]/.test(password), weight: 15 },
    { test: /[0-9]/.test(password), weight: 15 },
    { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), weight: 25 },
  ];

  strengthChecks.forEach((check) => {
    if (check.test) strength += check.weight;
  });

  // Determine strength level and color
  let level: "weak" | "fair" | "good" | "strong";
  let bgColor: string;
  let textColor: string;

  if (strength < 30) {
    level = "weak";
    bgColor = "bg-red-500";
    textColor = "text-red-600 dark:text-red-400";
  } else if (strength < 60) {
    level = "fair";
    bgColor = "bg-orange-500";
    textColor = "text-orange-600 dark:text-orange-400";
  } else if (strength < 80) {
    level = "good";
    bgColor = "bg-yellow-500";
    textColor = "text-yellow-600 dark:text-yellow-400";
  } else {
    level = "strong";
    bgColor = "bg-emerald-500";
    textColor = "text-emerald-600 dark:text-emerald-400";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Strength:</span>
        <span className={`text-xs font-medium capitalize ${textColor}`}>
          {level}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all duration-300 ${bgColor}`}
          style={{ width: `${Math.min(strength, 100)}%` }}
        />
      </div>
    </div>
  );
}
