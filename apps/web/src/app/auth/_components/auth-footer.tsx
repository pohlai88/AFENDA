import type { ReactNode } from "react";
import { cn } from "@afenda/ui";

interface AuthFooterProps {
  children: ReactNode;
  className?: string;
}

export function AuthFooter({ children, className }: AuthFooterProps) {
  return (
    <footer
      className={cn(
        "mt-6 text-center text-sm text-muted-foreground",
        "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 hover:[&_a]:underline",
        className
      )}
    >
      {children}
    </footer>
  );
}