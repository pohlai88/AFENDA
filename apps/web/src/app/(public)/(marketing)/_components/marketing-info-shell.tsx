import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

// ============================================================================
// SHELL WRAPPER
// ============================================================================

export type MarketingInfoShellWidth = "narrow" | "default" | "wide";

const ARTICLE_WIDTH_CLASS: Record<MarketingInfoShellWidth, string> = {
  narrow: "mi-article mi-article--narrow",
  default: "mi-article",
  wide: "mi-article mi-article--wide",
} as const;

export interface MarketingInfoShellProps extends React.HTMLAttributes<HTMLElement> {
  /** Controls the max-width constraint of the central article. */
  width?: MarketingInfoShellWidth;
  /** Class applied to the inner `<article>` tag */
  articleClassName?: string;
  /**
   * Render as a different HTML element for the shell wrapper.
   * @default "main"
   */
  as?: "main" | "section" | "div";
}

/**
 * Normalized shell for public marketing info pages (about, contact, privacy, etc.).
 * Sets up the strict `.mi-page > .mi-shell > .mi-article` DOM structure required by the CSS.
 */
export const MarketingInfoShell = React.forwardRef<HTMLElement, MarketingInfoShellProps>(
  function MarketingInfoShell(
    { className, articleClassName, children, width = "default", as: Component = "main", ...props },
    ref,
  ) {
    const article = (
      <article className={cn(ARTICLE_WIDTH_CLASS[width], articleClassName)}>{children}</article>
    );

    if (Component === "section") {
      return (
        <div className="mi-page">
          <section
            ref={ref as React.Ref<HTMLElement>}
            className={cn("mi-shell", className)}
            {...props}
          >
            {article}
          </section>
        </div>
      );
    }

    if (Component === "div") {
      return (
        <div className="mi-page">
          <div
            ref={ref as React.Ref<HTMLDivElement>}
            className={cn("mi-shell", className)}
            {...props}
          >
            {article}
          </div>
        </div>
      );
    }

    return (
      <div className="mi-page">
        <main ref={ref as React.Ref<HTMLElement>} className={cn("mi-shell", className)} {...props}>
          {article}
        </main>
      </div>
    );
  },
);

// ============================================================================
// HEADER COMPONENTS
// ============================================================================

export const MarketingInfoHeader = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  function MarketingInfoHeader({ className, ...props }, ref) {
    return <header ref={ref} className={cn("mi-header", className)} {...props} />;
  },
);

export const MarketingInfoKicker = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoKicker({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-kicker", className)} {...props} />;
});

export interface MarketingInfoTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

export const MarketingInfoTitle = React.forwardRef<HTMLHeadingElement, MarketingInfoTitleProps>(
  function MarketingInfoTitle({ className, asChild = false, ...props }, ref) {
    const Comp = asChild ? Slot : "h1";
    return <Comp ref={ref} className={cn("mi-title", className)} {...props} />;
  },
);

export interface MarketingInfoDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

export const MarketingInfoDescription = React.forwardRef<
  HTMLParagraphElement,
  MarketingInfoDescriptionProps
>(function MarketingInfoDescription({ className, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : "p";
  return <Comp ref={ref} className={cn("mi-description", className)} {...props} />;
});

export const MarketingInfoMeta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoMeta({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-meta", className)} {...props} />;
});

// ============================================================================
// CONTENT & FOOTER
// ============================================================================

export const MarketingInfoContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-content", className)} {...props} />;
});

export const MarketingInfoFooter = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  function MarketingInfoFooter({ className, ...props }, ref) {
    return <footer ref={ref} className={cn("mi-footer", className)} {...props} />;
  },
);

export const MarketingInfoCta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoCta({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-cta", className)} {...props} />;
});

export const MarketingInfoCtaTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function MarketingInfoCtaTitle({ className, ...props }, ref) {
  return <h2 ref={ref} className={cn("mi-cta-title", className)} {...props} />;
});

export const MarketingInfoCtaBody = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function MarketingInfoCtaBody({ className, ...props }, ref) {
  return <p ref={ref} className={cn("mi-cta-body", className)} {...props} />;
});

export const MarketingInfoCtaRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoCtaRow({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-cta-row", className)} {...props} />;
});
