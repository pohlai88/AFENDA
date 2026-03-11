import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@afenda/ui";
import { AfendaLogo } from "@/app/(public)/(marketing)/AfendaLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AuthHeaderProps {
  title?: string;
  backHref?: string;
  backLabel?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function AuthHeader({
  title = "AFENDA",
  backHref,
  backLabel,
  actionHref,
  actionLabel,
}: AuthHeaderProps) {
  const compact = Boolean(backHref || actionHref);

  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link href="/" className="shrink-0">
          <AfendaLogo
            size={compact ? "sm" : "md"}
            showTagline={false}
            align="start"
            aria-label={title}
          />
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {backHref && backLabel ? (
            <Button asChild variant="ghost" size="sm" className="h-9 px-2.5">
              <Link href={backHref}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>{backLabel}</span>
              </Link>
            </Button>
          ) : null}

          {actionHref && actionLabel ? (
            <Button asChild variant="ghost" size="sm" className="h-9 px-2.5">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : null}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}