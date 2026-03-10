"use client";

import React from "react";
import { motion } from "motion/react";
import { AfendaMark } from "./AfendaMark";

/* ──────────────────────────────────────────────────────────────────────────
   AfendaLogo — Unified brand lock-up (icon + name + tagline)

   Proportional anchoring ratio:
     1× Icon  — AfendaMark anchored to cap-height of the brand name
     2× Brand — Heavy sans-serif with tight negative tracking (-0.03em)
     0.5× Tag — Monospace uppercase at half the brand's visual weight

   The icon, name and tagline form a single responsive flex unit.
   Two rendering modes:
     variant="static"   → Instant paint, no motion.  Nav, footer, meta.
     variant="animated"  → Staggered entry + tagline fade-up.  Hero, CTA.

   Sizes (sm / md / lg) scale all three layers proportionally.
   ────────────────────────────────────────────────────────────────────────── */

const scales = {
  sm: { icon: 18, text: "text-lg",  tag: "text-[10px]", gap: "gap-1.5", tagGap: "gap-0.5" },
  md: { icon: 24, text: "text-2xl", tag: "text-[11px]", gap: "gap-2.5", tagGap: "gap-1"   },
  lg: { icon: 32, text: "text-4xl", tag: "text-[13px]", gap: "gap-3",   tagGap: "gap-1.5" },
} as const;

interface AfendaLogoProps {
  /** Proportional size preset */
  size?: "sm" | "md" | "lg";
  /** "static" for chrome areas, "animated" for hero/CTA/interactive */
  variant?: "static" | "animated";
  /** Show the tagline foundation line */
  showTagline?: boolean;
  /** Cross-axis alignment: "center" for hero/auth, "start" for nav/footer */
  align?: "center" | "start";
  className?: string;
}

export function AfendaLogo({
  size = "md",
  variant = "static",
  showTagline = true,
  align = "center",
  className = "",
}: AfendaLogoProps) {
  const s = scales[size];
  const isAnimated = variant === "animated";
  const alignClass = align === "start" ? "items-start" : "items-center";

  return (
    <div className={`flex flex-col ${alignClass} ${s.tagGap} ${className}`}>
      {/* Line 1: Icon + Brand Name — cap-height aligned */}
      <div className={`flex items-center ${s.gap}`}>
        <AfendaMark
          size={s.icon}
          variant={variant}
          className="flex-shrink-0"
        />
        <span
          className={`${s.text} font-bold tracking-[-0.03em] leading-none text-foreground`}
        >
          AFENDA
        </span>
      </div>

      {/* Line 2: Tagline — mono foundation at 50% visual weight */}
      {showTagline && (
        <motion.p
          initial={
            isAnimated ? { opacity: 0, y: 4 } : { opacity: 1, y: 0 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={isAnimated ? { delay: 0.25, duration: 0.4 } : { duration: 0 }}
          className={`${s.tag} font-mono uppercase tracking-[0.2em] text-muted-foreground`}
        >
          Where numbers become canon
        </motion.p>
      )}
    </div>
  );
}
