"use client";

/**
 * Landing-page UI primitives — AFENDA design tokens only.
 * Uses semantic utilities (bg-primary, border-border, text-foreground, etc.)
 * so marketing stays aligned with the design system (L0–L4).
 */

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── Button ──────────────────────────────────────────────────────────────── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm":
              variant === "default",
            "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground":
              variant === "outline",
            "text-foreground-secondary hover:bg-accent hover:text-accent-foreground":
              variant === "ghost",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "LandingButton";

/* ── Card (L2) ───────────────────────────────────────────────────────────── */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "LandingCard";

/* ── Badge ───────────────────────────────────────────────────────────────── */
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        {
          "border-transparent bg-primary-soft text-primary": variant === "default",
          "border-transparent bg-muted text-muted-foreground": variant === "secondary",
          "border border-border text-foreground": variant === "outline",
        },
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "LandingBadge";
