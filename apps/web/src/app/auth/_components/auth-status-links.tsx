import Link from "next/link";
import { cn } from "@afenda/ui";

interface AuthStatusLinksProps {
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}

export function AuthStatusLinks({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: AuthStatusLinksProps) {
  const hasPrimary = primaryHref && primaryLabel;
  const hasSecondary = secondaryHref && secondaryLabel;

  if (!hasPrimary && !hasSecondary) return null;

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm",
        className
      )}
    >
      {hasPrimary && (
        <Link
          href={primaryHref}
          className="font-medium text-current underline-offset-4 hover:underline"
        >
          {primaryLabel}
        </Link>
      )}

      {hasSecondary && (
        <Link
          href={secondaryHref}
          className="text-current/80 underline-offset-4 hover:underline"
        >
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}