import { cn } from "@afenda/ui";
import type { AuthActionState } from "../_lib/auth-state";
import { AuthStatusLinks } from "./auth-status-links";

interface AuthFormMessageProps {
  state?: AuthActionState | null;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}

export function AuthFormMessage({
  state,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: AuthFormMessageProps) {
  if (!state?.message) return null;

  const isSuccess = state.ok;

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={cn(
        "space-y-3 rounded-lg border px-4 py-3 text-sm",
        isSuccess
          ? "border-success/20 bg-success/10 text-success"
          : "border-destructive/20 bg-destructive/10 text-destructive",
        className
      )}
    >
      <p className="leading-6">{state.message}</p>

      <AuthStatusLinks
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
      />
    </div>
  );
}