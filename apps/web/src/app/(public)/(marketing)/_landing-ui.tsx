"use client";

/**
 * Landing-page-only UI primitives.
 *
 * These are standalone dark-theme wrappers for the public marketing page.
 * They intentionally diverge from the ERP design system because the landing
 * page uses an independent dark-terminal aesthetic (Bloomberg / Linear style).
 *
 * shadcn-exempt: Marketing page intentionally uses raw elements for the
 * standalone dark-theme system that doesn't share the ERP component library.
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
      /* shadcn-exempt: landing-page standalone dark-theme button */
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)]":
              variant === "default",
            "border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white":
              variant === "outline",
            "hover:bg-slate-800 hover:text-white text-slate-300": variant === "ghost",
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

/* ── Card ────────────────────────────────────────────────────────────────── */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm",
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
        "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        {
          "border-transparent bg-teal-500/10 text-teal-400": variant === "default",
          "border-transparent bg-slate-800 text-slate-100": variant === "secondary",
          "text-slate-100 border border-slate-700": variant === "outline",
        },
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "LandingBadge";
