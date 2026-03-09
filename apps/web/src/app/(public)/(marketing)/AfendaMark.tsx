"use client";

import React from "react";
import { motion } from "motion/react";

/* ──────────────────────────────────────────────────────────────────────────
   AfendaMark — Brand icon component (unified SVG structure)

   variant="static"   → Identical geometry, transitions disabled (duration: 0).
                         Favicons, nav, footer, metadata.
   variant="animated"  → Spring-physics morphology on hover + stagger on view.
                         Hero, CTA, marketing showcase, interactive areas.

   Spring model (stiffness 400, damping 25) replaces cubic-bezier for
   tactile, Apple/Figma-grade feel with natural overshoot.
   ────────────────────────────────────────────────────────────────────────── */

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
};

interface AfendaMarkProps {
  /** Icon render size in px (scales from 24×24 viewBox) */
  size?: number;
  /** "static" for chrome/nav/footer, "animated" for hero/CTA/interactive */
  variant?: "static" | "animated";
  /** Override fill/stroke color. Defaults to teal-500 */
  color?: string;
  /** Hover color shift. Defaults to teal-700 */
  hoverColor?: string;
  className?: string;
}

export function AfendaMark({
  size = 24,
  variant = "static",
  color = "#14b8a6",
  hoverColor = "#0d9488",
  className,
}: AfendaMarkProps) {
  const isAnimated = variant === "animated";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AFENDA"
      initial={isAnimated ? "hidden" : "visible"}
      whileInView="visible"
      whileHover={isAnimated ? "hover" : undefined}
      viewport={{ once: true, margin: "-20px" }}
    >
      {/* Dot 1 */}
      <motion.circle
        cx="5"
        cy="12"
        r="2"
        fill={color}
        variants={{
          hidden: { scale: 0, opacity: 0 },
          visible: { scale: 1, opacity: 1 },
          hover: { scale: 1.2, fill: hoverColor },
        }}
        transition={isAnimated ? springTransition : { duration: 0 }}
      />
      {/* Dot 2 */}
      <motion.circle
        cx="12"
        cy="12"
        r="2"
        fill={color}
        variants={{
          hidden: { scale: 0, opacity: 0 },
          visible: { scale: 1, opacity: 1 },
          hover: {
            scale: 1.2,
            fill: hoverColor,
            transition: { delay: 0.05, ...springTransition },
          },
        }}
        transition={isAnimated ? springTransition : { duration: 0 }}
      />
      {/* Audit Ring — r=2.5 so outer edge (3.25px) optically matches 4px solid dots */}
      <motion.circle
        cx="19"
        cy="12"
        r="2.5"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        variants={{
          hidden: { scale: 0, opacity: 0, pathLength: 0 },
          visible: { scale: 1, opacity: 1, pathLength: 1 },
          hover: {
            scale: 1.25,
            stroke: hoverColor,
            strokeWidth: 2,
            transition: { delay: 0.1, ...springTransition },
          },
        }}
        transition={
          isAnimated
            ? { ...springTransition, pathLength: { duration: 0.8 } }
            : { duration: 0 }
        }
      />
    </motion.svg>
  );
}
