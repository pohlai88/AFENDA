import { memo } from "react";
import { cn } from "@afenda/ui";
import { calculatePasswordStrength, getPasswordStrengthColor } from "./password-strength";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const PasswordStrengthIndicator = memo(function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  if (password.length === 0) return null;

  const strength = calculatePasswordStrength(password);

  return (
    <div className={cn("space-y-1.5 pt-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength:</span>
        <span
          className="font-medium"
          style={{ color: getPasswordStrengthColor(strength.score) }}
        >
          {strength.label}
        </span>
      </div>
      
      {/* Custom progress bar with dynamic color */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-all duration-300 ease-in-out"
          style={{
            width: `${strength.percentage}%`,
            backgroundColor: getPasswordStrengthColor(strength.score),
          }}
        />
      </div>
      
      {strength.feedback.length > 0 && (
        <p className="text-xs text-muted-foreground">{strength.feedback.join(" • ")}</p>
      )}
    </div>
  );
});
