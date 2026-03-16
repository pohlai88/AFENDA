import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

// ============================================================================
// SECTION PRIMITIVES
// ============================================================================

export interface MarketingInfoSectionProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const MarketingInfoSection = React.forwardRef<HTMLElement, MarketingInfoSectionProps>(
  function MarketingInfoSection({ className, asChild = false, ...props }, ref) {
    const Comp = asChild ? Slot : "section";
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        className={cn("mi-section", className)}
        {...props}
      />
    );
  },
);

export const MarketingInfoSectionHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoSectionHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-section-header", className)} {...props} />;
});

export const MarketingInfoSectionTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function MarketingInfoSectionTitle({ className, ...props }, ref) {
  return (
    /* eslint-disable-next-line jsx-a11y/heading-has-content -- Content from caller via children */
    <h2 ref={ref} className={cn("mi-section-title", className)} {...props} />
  );
});

export const MarketingInfoSectionDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function MarketingInfoSectionDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("mi-section-description", className)} {...props} />;
});

/** L1 operating surface: wraps content so L2 cards sit inside it (demo depth). */
export const MarketingInfoL1 = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoL1({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-l1", className)} {...props} />;
});

export type MarketingInfoGridColumns = 1 | 2 | 3;

export interface MarketingInfoGridProps extends React.HTMLAttributes<HTMLUListElement> {
  columns?: MarketingInfoGridColumns;
}

export const MarketingInfoGrid = React.forwardRef<HTMLUListElement, MarketingInfoGridProps>(
  function MarketingInfoGrid({ className, columns = 2, ...props }, ref) {
    const columnClass = columns === 1 ? "mi-grid--1" : columns === 2 ? "mi-grid--2" : "mi-grid--3";
    return <ul ref={ref} className={cn("mi-grid mi-list", columnClass, className)} {...props} />;
  },
);

// ============================================================================
// CARD PRIMITIVES
// ============================================================================

export type MarketingInfoCardTone = "default" | "muted" | "raised" | "premium";

export interface MarketingInfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: MarketingInfoCardTone;
  asChild?: boolean;
}

export const MarketingInfoCard = React.forwardRef<HTMLDivElement, MarketingInfoCardProps>(
  function MarketingInfoCard({ className, tone = "default", asChild = false, ...props }, ref) {
    const Comp = asChild ? Slot : "div";
    const toneClass = tone === "default" ? "mi-card" : `mi-card mi-card--${tone}`;
    return (
      <Comp
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(toneClass, className)}
        {...props}
      />
    );
  },
);

export const MarketingInfoCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoCardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-card-header", className)} {...props} />;
});

export const MarketingInfoCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function MarketingInfoCardTitle({ className, ...props }, ref) {
  return (
    /* eslint-disable-next-line jsx-a11y/heading-has-content -- Content from caller via children */
    <h3 ref={ref} className={cn("mi-card-title", className)} {...props} />
  );
});

export const MarketingInfoCardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function MarketingInfoCardBody({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mi-card-body", className)} {...props} />;
});

export type MarketingInfoBadgeTone = "primary" | "premium";

export interface MarketingInfoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: MarketingInfoBadgeTone;
}

export const MarketingInfoBadge = React.forwardRef<HTMLSpanElement, MarketingInfoBadgeProps>(
  function MarketingInfoBadge({ className, tone = "primary", ...props }, ref) {
    return <span ref={ref} className={cn("mi-badge", `mi-badge--${tone}`, className)} {...props} />;
  },
);
