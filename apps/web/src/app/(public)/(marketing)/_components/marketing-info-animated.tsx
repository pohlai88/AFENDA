"use client";

import { motion, type Variants } from "motion/react";
import type { ComponentProps } from "react";
import { useRef } from "react";

import {
  MarketingInfoCard,
  MarketingInfoL1,
  MarketingInfoSection,
  MarketingInfoBadge,
} from "./marketing-info-primitives";

// A premium, architectural easing curve (decisive entry, smooth finish)
const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

// ============================================================================
// CARDS & HOVERS
// ============================================================================

const cardVariants: Variants = {
  initial: {
    y: 0,
  },
  hover: {
    y: -4, // A very subtle, grounded lift. (Let your CSS handle the shadow change)
    transition: {
      duration: 0.4,
      ease: PREMIUM_EASE,
    },
  },
};

export function AnimatedCard({
  children,
  ...props
}: ComponentProps<typeof MarketingInfoCard>) {
  return (
    <MarketingInfoCard asChild {...props}>
      <motion.div
        variants={cardVariants}
        initial="initial"
        whileHover="hover"
      >
        {children}
      </motion.div>
    </MarketingInfoCard>
  );
}

// ============================================================================
// BADGES
// ============================================================================

const badgeVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 20,
    },
  },
  tap: { scale: 0.98 },
};

export function AnimatedBadge({
  children,
  ...props
}: ComponentProps<typeof MarketingInfoBadge>) {
  return (
    <motion.span
      className={`mi-badge mi-badge--${props.tone ?? "primary"}`}
      variants={badgeVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
    >
      {children}
    </motion.span>
  );
}

// ============================================================================
// ENTRANCES (Fades & Lifts)
// ============================================================================

// Premium fade-in with a short, controlled entrance
export function AnimatedFadeIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }} // Reduced from 80 to a clean 24px
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.8,
        ease: PREMIUM_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// STAGGERED GRIDS
// ============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // Faster stagger. Feels crisp, not tedious.
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20, // Short, subtle upward movement
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: PREMIUM_EASE,
    },
  },
};

export function AnimatedGrid({
  children,
  columns,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const columnClass = columns === 1 ? "mi-grid--1" : columns === 2 ? "mi-grid--2" : "mi-grid--3";
  return (
    <motion.ul
      className={`mi-grid mi-list ${columnClass}`}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.ul>
  );
}

export function AnimatedGridItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.li variants={itemVariants}>
      {children}
    </motion.li>
  );
}

// ============================================================================
// SURFACE WRAPPERS
// ============================================================================

export function AnimatedL1({
  children,
  ...props
}: ComponentProps<typeof MarketingInfoL1>) {
  return (
    <AnimatedFadeIn>
      <MarketingInfoL1 {...props}>{children}</MarketingInfoL1>
    </AnimatedFadeIn>
  );
}

export function AnimatedSection({
  children,
  ...props
}: ComponentProps<typeof MarketingInfoSection>) {
  return (
    <AnimatedFadeIn>
      <MarketingInfoSection {...props}>{children}</MarketingInfoSection>
    </AnimatedFadeIn>
  );
}