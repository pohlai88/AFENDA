import type { ReactNode } from "react";
import { cn } from "@afenda/ui";

interface AuthSplitShellProps {
  aside: ReactNode;
  children: ReactNode;
  className?: string;
  asideClassName?: string;
  contentClassName?: string;
  mobileContentClassName?: string;
}

export function AuthSplitShell({
  aside,
  children,
  className,
  asideClassName,
  contentClassName,
  mobileContentClassName,
}: AuthSplitShellProps) {
  return (
    <>
      <div
        className={cn(
          "hidden min-h-dvh w-full items-center justify-center overflow-hidden px-6 py-6 lg:flex xl:px-8 xl:py-8",
          className
        )}
      >
        <div className="grid min-h-[calc(100dvh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border shadow-2xl lg:grid-cols-[1.08fr_0.92fr] bg-modal">
          <aside
            className={cn(
              "flex min-w-0 flex-col justify-center overflow-hidden px-8 py-10 xl:px-12 xl:py-12 bg-surface-275",
              asideClassName
            )}
          >
            <div className="w-full min-w-0">{aside}</div>
          </aside>

          <main
            className={cn(
              "flex min-w-0 flex-col justify-center border-l border-border-strong bg-modal px-8 py-10 xl:px-11 xl:py-12",
              contentClassName
            )}
          >
            <div className="mx-auto w-full max-w-lg">{children}</div>
          </main>
        </div>
      </div>

      <div className="flex min-h-dvh items-center justify-center px-4 py-5 lg:hidden">
        <main className={cn("w-full max-w-md", mobileContentClassName)}>
          {children}
        </main>
      </div>
    </>
  );
}