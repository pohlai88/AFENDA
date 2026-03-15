/* ═══════════════════════════════════════════════════════════════════════
   HERO — "The Classified Dossier" v3

   Two-layer architecture with cinematic tear-off reveal:

   LAYER 0 — Full marketing hero (always in DOM, crawlable)
   LAYER 1 — Frosted-glass veil with blurred preview bleed-through

   Enhancements:
   • A/B auto-dismiss timer (8 s vs 12 s, random per session)
   • Frosted veil with backdrop-blur showing ghostly hero preview
   • Tear-edge light leak particles during drag
   • Teal particle confetti burst on reveal
   • Circular SVG countdown ring
   • Dramatic veil fly-off exit + hero content bloom
   • Veil plays every visit (no session skip)
   • Full a11y: skip-link, aria-live, keyboard, reduced-motion
   ═══════════════════════════════════════════════════════════════════ */

/* token-compliance-exempt: Marketing layout uses isolated dark-terminal palette */
/* eslint-disable @afenda/no-hardcoded-colors */
"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  useInView,
  AnimatePresence,
  type PanInfo,
} from "motion/react";
import { Badge, Button } from "./_landing-ui";
import { AfendaMark } from "./AfendaMark";
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Scale,
  Zap,
  Gavel,
  Activity,
  Lock,
  CheckCircle2,
  Database,
  Globe,
  FileText,
  BarChart3,
  Fingerprint,
  Eye,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const AB_TIMER_KEY = "afenda-ab-timer-v2";
const DRAG_THRESHOLD = -200;
const PARTICLE_COUNT = 36;

const PILLARS = [
  {
    icon: Gavel,
    label: "Legislation-ready",
    desc: "SOC 2, SOX, GDPR, FCPA — enforced by architecture, not checklists.",
    badge: "COMPLIANT",
  },
  {
    icon: Scale,
    label: "Forensic-grade",
    desc: "Every fact, correction, and reversal cryptographically traceable.",
    badge: "VERIFIED",
  },
  {
    icon: ShieldCheck,
    label: "Jurisdiction-native",
    desc: "180+ tax rules. Multi-entity consolidation across every jurisdiction.",
    badge: "180+ RULES",
  },
  {
    icon: Zap,
    label: "Runs out of the box",
    desc: "No configuration. No consultants. Deploy and the truth engine is live.",
    badge: "ZERO-CONFIG",
  },
] as const;

const FEED_LINES = [
  { text: "GL consolidation — 24 entities", status: "ok" as const },
  { text: "Intercompany elim. — $41.2M balanced", status: "ok" as const },
  { text: "Vendor cluster VND-4471 flagged", status: "warn" as const },
  { text: "SOX 404 control pass — Q4 batch", status: "ok" as const },
  { text: "Treasury sweep — $1.2M rebalanced", status: "info" as const },
  { text: "FX reconciliation — matched", status: "ok" as const },
  { text: "ASC 606 rev. recognition — compliant", status: "ok" as const },
  { text: "APAC subsidiary sync — 0 delta", status: "ok" as const },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** A/B timer: randomly assign 8s or 12s, persist for session consistency */
function getABTimer(): number {
  try {
    const stored = sessionStorage.getItem(AB_TIMER_KEY);
    if (stored === "8" || stored === "12") return Number(stored);
    const variant = Math.random() < 0.5 ? 8 : 12;
    sessionStorage.setItem(AB_TIMER_KEY, String(variant));
    return variant;
  } catch {
    return 10;
  }
}

// ─── Particle types ─────────────────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  size: number;
  hue: number;
  delay: number;
  duration: number;
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: 50 + (((i * 13) % 20) - 10),
    y: 50 + (((i * 7) % 30) - 15),
    angle: (i / PARTICLE_COUNT) * 360 + ((i * 17) % 30),
    distance: 120 + ((i * 11) % 280),
    size: 2 + ((i * 3) % 5),
    hue: 155 + ((i * 7) % 30),
    delay: ((i * 5) % 150) / 1000,
    duration: 0.6 + ((i * 3) % 8) / 10,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════
   CONFETTI BURST — Particle explosion on reveal
   ═══════════════════════════════════════════════════════════════════ */

function ConfettiBurst({ onComplete }: { onComplete: () => void }) {
  const particles = useMemo(generateParticles, []);

  useEffect(() => {
    const t = setTimeout(onComplete, 1800);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Central flash */}
      <motion.div
        className="absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(52,211,153,0.25) 0%, rgba(20,184,166,0.08) 40%, transparent 70%)",
        }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 1, ease: EASE }}
      />

      {/* Particles */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: `hsla(${p.hue}, 80%, 60%, 0.9)`,
              boxShadow: `0 0 ${p.size * 2}px hsla(${p.hue}, 80%, 60%, 0.5)`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: tx, y: ty, opacity: 0, scale: 0.3 }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          />
        );
      })}

      {/* Horizontal light sweep */}
      <motion.div
        className="absolute top-0 bottom-0 left-1/2 w-1"
        style={{
          background: "linear-gradient(to bottom, transparent, rgba(52,211,153,0.4), transparent)",
        }}
        initial={{ scaleY: 0, opacity: 1 }}
        animate={{ scaleY: 1, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   COUNTDOWN RING — Circular SVG progress ring
   ═══════════════════════════════════════════════════════════════════ */

function CountdownRing({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number;
  totalSeconds: number;
}) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / totalSeconds;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex h-9 w-9 items-center justify-center">
      <svg width="36" height="36" className="-rotate-90">
        {/* Track */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="rgba(71,85,105,0.3)"
          strokeWidth="2"
        />
        {/* Progress */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="rgba(52,211,153,0.6)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="absolute font-mono text-[9px] text-slate-500 tabular-nums">
        {secondsLeft}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TEAR-EDGE LEAK — Particles escaping through the tear during drag
   ═══════════════════════════════════════════════════════════════════ */

const LEAK_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  top: `${15 + (i * 70) / 8}%`,
  w: 3 + ((i * 7) % 3),
  bg: `rgba(52,211,153,${0.3 + ((i * 13) % 40) / 100})`,
  animX: 20 + ((i * 11) % 30),
  animY: ((i * 17) % 40) - 20,
  dur: 0.5 + ((i * 7) % 5) / 10,
}));

function TearEdgeLeak({ intensity }: { intensity: number }) {
  const count = Math.floor(intensity * 8);
  if (count <= 0) return null;

  return (
    <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-4 overflow-visible">
      {LEAK_PARTICLES.slice(0, count).map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: -2,
            top: p.top,
            width: p.w,
            height: p.w,
            backgroundColor: p.bg,
            boxShadow: "0 0 6px rgba(52,211,153,0.4)",
          }}
          initial={{ x: 0, opacity: 0.8 }}
          animate={{ x: p.animX, opacity: 0, y: p.animY }}
          transition={{ duration: p.dur, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VEIL — "The Classified Dossier" with frosted-glass preview
   ═══════════════════════════════════════════════════════════════════ */

function Veil({ onReveal, reduced: _reduced }: { onReveal: () => void; reduced: boolean | null }) {
  const dragX = useMotionValue(0);
  const revealBtnRef = useRef<HTMLButtonElement>(null);
  const [timerSeconds, setTimerSeconds] = useState(10); // SSR-safe default
  const [countdown, setCountdown] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const [hintPhase, setHintPhase] = useState<"active" | "fading" | "gone">("active");
  const dragProgressRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRevealedRef = useRef(false);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  // Motion transforms
  const veilRotateY = useTransform(dragX, [0, -600], [0, -22]);
  const veilScale = useTransform(dragX, [0, -400], [1, 0.92]);
  const contentOpacity = useTransform(dragX, [0, -120], [1, 0]);
  const blurAmount = useTransform(dragX, [0, -300], [24, 4]);
  const tearGlow = useTransform(dragX, [0, -80], [0, 1]);
  const progressBar = useTransform(dragX, [0, DRAG_THRESHOLD], [0, 1]);
  const tearEdgeBrightness = useTransform(dragX, [0, -150], [0.1, 0.8]);
  const backdropBlur = useTransform(blurAmount, (v) => `blur(${v}px)`);

  // Track drag progress for leak particles (ref avoids state-driven re-renders)
  useEffect(() => {
    const unsub = progressBar.on("change", (v) => {
      dragProgressRef.current = Math.max(0, Math.min(1, v));
    });
    return unsub;
  }, [progressBar]);

  // Initialize timer from sessionStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const t = getABTimer();
    setTimerSeconds(t);
    setCountdown(t);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (!hasRevealedRef.current) {
            hasRevealedRef.current = true;
            queueMicrotask(() => onRevealRef.current());
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Pause countdown while dragging
  useEffect(() => {
    if (isDragging && countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [isDragging]);

  // Hint lifecycle: active → fading → gone
  useEffect(() => {
    const t1 = setTimeout(() => setHintPhase("fading"), 2500);
    const t2 = setTimeout(() => setHintPhase("gone"), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Focus reveal button
  useEffect(() => {
    revealBtnRef.current?.focus({ preventScroll: true });
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setHintPhase("gone");
  }, []);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      if (info.offset.x < DRAG_THRESHOLD || info.velocity.x < -400) {
        onReveal();
      } else {
        // Resume countdown
        countdownRef.current = setInterval(() => {
          setCountdown((c) => (c <= 1 ? 0 : c - 1));
        }, 1000);
      }
    },
    [onReveal],
  );

  return (
    <motion.div
      className="absolute inset-x-0 top-0 z-30 h-dvh"
      style={{ perspective: "1400px" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Screen-reader skip link */}
      <a
        href="#hero-content"
        onClick={(e) => {
          e.preventDefault();
          onReveal();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      {/* ── The draggable veil surface ── */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -1400, right: 0 }}
        dragElastic={0.06}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          x: dragX,
          rotateY: veilRotateY,
          scale: veilScale,
          transformOrigin: "right center",
        }}
        exit={{ x: "-110%", rotateY: -35, scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="absolute inset-x-0 top-0 flex h-dvh touch-pan-y flex-col items-center justify-center overflow-hidden select-none"
      >
        {/* Frosted glass — hero shows through as blurred ghost */}
        <motion.div
          className="absolute inset-0 bg-[#020617]/85"
          style={{ backdropFilter: backdropBlur, WebkitBackdropFilter: backdropBlur }}
        />

        {/* Scan lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(148,163,184,0.5) 2px, rgba(148,163,184,0.5) 3px)",
          }}
        />

        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* Classification stamps */}
        <div className="pointer-events-none absolute top-5 left-5 flex items-center gap-2 sm:top-6 sm:left-6">
          <Fingerprint className="h-4 w-4 text-slate-700/80" />
          <span className="font-mono text-[8px] tracking-[0.22em] text-slate-700/80 uppercase sm:text-[9px]">
            CLASSIFIED // AUTHORIZED_REVIEW_ONLY
          </span>
        </div>
        <div className="pointer-events-none absolute top-5 right-16 hidden sm:top-6 sm:right-20 sm:block">
          <span className="font-mono text-[9px] tracking-[0.18em] text-slate-800/60">
            DOC_REF: AFD-2026-001
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-20 left-5 sm:bottom-6 sm:left-6">
          <span className="font-mono text-[8px] tracking-[0.15em] text-slate-800/50 sm:text-[9px]">
            AFENDA // TRUTH_ENGINE v4.1 // {timerSeconds === 8 ? "COHORT_A" : "COHORT_B"}
          </span>
        </div>

        {/* ── Center provocation ── */}
        <motion.div
          style={{ opacity: contentOpacity }}
          className="pointer-events-none relative z-10 flex max-w-2xl flex-col items-center px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-8 flex items-center gap-2.5"
          >
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500/60" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-emerald-500/40 uppercase sm:text-[11px]">
              System.Identify(Self)
            </span>
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500/60" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
            className="text-2xl leading-[1.15] tracking-tight text-slate-200 sm:text-3xl md:text-4xl lg:text-5xl"
          >
            Most ledgers are just{" "}
            <span className="relative inline-block">
              <span className="font-semibold text-white">opinions</span>
              <motion.span
                className="absolute right-0 -bottom-1 left-0 h-px bg-linear-to-r from-transparent via-emerald-400/60 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
              />
            </span>
            .
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="mt-6 text-sm text-slate-500 sm:mt-8 sm:text-base"
          >
            <span className="italic">Tear away to reveal the truth</span>
            <span className="mx-2 hidden text-slate-700 sm:inline">—</span>
            <span className="hidden font-mono text-[11px] tracking-wider text-slate-600 sm:inline">
              or wait {timerSeconds}s
            </span>
          </motion.p>
        </motion.div>

        {/* ── Tear strip — right edge (always visible) ── */}
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 flex w-14 flex-col items-center justify-center">
          {/* Perforated tear line — always visible */}
          <div
            className="absolute inset-y-0 left-0 w-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(52,211,153,0.25) 0px, rgba(52,211,153,0.25) 6px, transparent 6px, transparent 14px)",
            }}
          />

          {/* Tear label + arrows — always visible */}
          <div className="flex flex-col items-center gap-2.5">
            <motion.div
              animate={hintPhase === "active" ? { x: [0, -8, 0] } : {}}
              transition={{
                duration: 1,
                repeat: hintPhase === "active" ? Infinity : 0,
                ease: "easeInOut",
              }}
              style={{
                opacity: hintPhase === "gone" ? 0.3 : hintPhase === "fading" ? 0.4 : 0.6,
              }}
            >
              <ChevronRight className="h-5 w-5 rotate-180 text-emerald-400/70" />
            </motion.div>
            <span
              className="font-mono text-[9px] tracking-[0.15em] text-emerald-500/30"
              style={{ writingMode: "vertical-lr" }}
            >
              TEAR_HERE
            </span>
            <motion.div
              animate={hintPhase === "active" ? { x: [0, -8, 0] } : {}}
              transition={{
                duration: 1,
                repeat: hintPhase === "active" ? Infinity : 0,
                ease: "easeInOut",
                delay: 0.1,
              }}
              style={{
                opacity: hintPhase === "gone" ? 0.3 : hintPhase === "fading" ? 0.4 : 0.6,
              }}
            >
              <ChevronRight className="h-5 w-5 rotate-180 text-emerald-400/70" />
            </motion.div>
          </div>
        </div>

        {/* Drag-activated glow (intensifies as user drags) */}
        <motion.div
          style={{ opacity: tearGlow }}
          className="pointer-events-none absolute top-0 right-0 bottom-0 w-14"
        >
          <motion.div
            className="absolute inset-y-0 left-0 w-12"
            style={{
              opacity: tearEdgeBrightness,
              background: "linear-gradient(to right, rgba(52,211,153,0.15), transparent)",
            }}
          />
        </motion.div>

        {/* Tear-edge leak particles */}
        {isDragging && <TearEdgeLeak intensity={dragProgressRef.current} />}

        {/* ── Bottom controls ── */}
        <div className="absolute right-0 bottom-6 left-0 z-20 flex flex-col items-center gap-3 sm:bottom-8">
          {/* Drag progress bar */}
          <div className="h-0.75 w-36 overflow-hidden rounded-full bg-slate-800/60">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-emerald-500/80 to-teal-400"
              style={{ scaleX: progressBar, transformOrigin: "left" }}
            />
          </div>

          {/* Reveal button + countdown ring */}
          <div className="pointer-events-auto flex items-center gap-3">
            <Button
              ref={revealBtnRef}
              variant="outline"
              size="lg"
              onClick={() => onReveal()}
              className="rounded-full border-slate-700/50 bg-slate-900/30 px-7 text-slate-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-slate-800/50 hover:text-white focus-visible:ring-emerald-500 focus-visible:ring-offset-slate-950"
            >
              <Eye className="mr-2 h-4 w-4 opacity-50" />
              Reveal
            </Button>
            <CountdownRing secondsLeft={countdown} totalSeconds={timerSeconds} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FEED TICKER
   ═══════════════════════════════════════════════════════════════════ */

function FeedTicker({ reduced }: { reduced: boolean | null }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % FEED_LINES.length), 2400);
    return () => clearInterval(t);
  }, [reduced]);

  const line = FEED_LINES[idx]!;

  return (
    <div className="flex h-5 items-center gap-2 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          {line.status === "ok" ? (
            <CheckCircle2 className="h-3 w-3 shrink-0 text-teal-500/70" />
          ) : line.status === "warn" ? (
            <Activity className="h-3 w-3 shrink-0 text-amber-500/70" />
          ) : (
            <Zap className="h-3 w-3 shrink-0 text-cyan-500/70" />
          )}
          <span className="truncate text-[11px] text-slate-500">{line.text}</span>
          <span
            className={`shrink-0 font-mono text-[9px] tracking-wider ${
              line.status === "ok"
                ? "text-teal-600"
                : line.status === "warn"
                  ? "text-amber-600"
                  : "text-cyan-600"
            }`}
          >
            {line.status === "ok" ? "PASS" : line.status === "warn" ? "FLAG" : "EXEC"}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SYSTEM STATUS STRIP
   ═══════════════════════════════════════════════════════════════════ */

function SystemStrip({ reduced, revealed }: { reduced: boolean | null; revealed: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const shouldAnimate = inView && revealed;

  const metrics = [
    { label: "Entities", value: "24", sub: "synced" },
    { label: "Controls", value: "847", sub: "active" },
    { label: "Integrity", value: "99.7%", sub: "score" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={shouldAnimate || reduced ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
      className="mx-auto w-full max-w-4xl"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-[#080a10]/80 shadow-[0_20px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur-xl">
        <div className="flex h-9 items-center gap-3 border-b border-slate-800/50 bg-[#0c0f17] px-4">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/60" />
          </div>
          <div className="flex flex-1 justify-center">
            <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.15em] text-slate-600">
              <Lock className="h-2.5 w-2.5 text-teal-600" />
              TRUTH_ENGINE — LIVE INTEGRITY MONITOR
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400/50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
            </span>
            <span className="font-mono text-[9px] tracking-wider text-teal-500">LIVE</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div className="flex items-center gap-5 sm:gap-6">
            {metrics.map((m, i) => (
              <div key={m.label} className="flex flex-col">
                <span className="font-mono text-[9px] tracking-[0.15em] text-slate-600 uppercase">
                  {m.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                    animate={shouldAnimate || reduced ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.65 + i * 0.08, ease: EASE }}
                    className="text-xl font-semibold tracking-tight text-white"
                  >
                    {m.value}
                  </motion.span>
                  <span className="font-mono text-[9px] text-slate-600">{m.sub}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden h-10 w-px bg-slate-800/60 sm:block" />
          <div className="flex items-center gap-2">
            {[
              { icon: Database, label: "GL" },
              { icon: FileText, label: "AP" },
              { icon: BarChart3, label: "AR" },
              { icon: Globe, label: "TAX" },
            ].map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.label}
                  className="flex items-center gap-1.5 rounded-md border border-slate-800/50 bg-slate-900/40 px-2 py-1"
                >
                  <Icon className="h-3 w-3 text-teal-600" />
                  <span className="font-mono text-[9px] tracking-[0.12em] text-slate-500">
                    {mod.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="hidden h-10 w-px bg-slate-800/60 sm:block" />
          <div className="min-w-0 shrink">
            <FeedTicker reduced={reduced} />
          </div>
        </div>

        <div className="relative h-px w-full overflow-hidden bg-slate-800/40">
          {!reduced && (
            <motion.div
              className="absolute inset-y-0 w-24 bg-linear-to-r from-transparent via-teal-400/40 to-transparent"
              animate={{ x: ["-96px", "calc(100vw + 96px)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PILLAR CARD
   ═══════════════════════════════════════════════════════════════════ */

function PillarCard({
  pillar,
  index,
  reduced,
  revealed,
}: {
  pillar: (typeof PILLARS)[number];
  index: number;
  reduced: boolean | null;
  revealed: boolean;
}) {
  const Icon = pillar.icon;
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={revealed || reduced ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.75 + index * 0.1, ease: EASE }}
      className="group relative rounded-xl border border-slate-800/50 bg-slate-900/20 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700/70 hover:bg-slate-900/40"
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/15 bg-teal-500/6 text-teal-400/80 transition-colors group-hover:border-teal-500/30 group-hover:bg-teal-500/10 group-hover:text-teal-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium tracking-tight text-slate-200 transition-colors group-hover:text-white">
              {pillar.label}
            </h3>
            <span className="shrink-0 rounded border border-teal-900/30 bg-teal-950/30 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.15em] text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
              {pillar.badge}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-500 transition-colors group-hover:text-slate-400">
            {pillar.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HERO — Main assembly
   ═══════════════════════════════════════════════════════════════════ */

export function Hero({ onRevealComplete }: { onRevealComplete?: () => void } = {}) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;

  // Sync after mount to avoid hydration mismatch (matchMedia is client-only)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      onRevealCompleteRef.current?.();
    }
  }, []);

  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // Lock scroll while veil is active
  useEffect(() => {
    if (revealed) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [revealed]);

  const handleReveal = useCallback(() => {
    if (!reducedRef.current) setShowConfetti(true);
    setRevealed(true);
    queueMicrotask(() => onRevealCompleteRef.current?.());
  }, []);

  const handleConfettiDone = useCallback(() => {
    setShowConfetti(false);
  }, []);

  return (
    <section
      id="hero-content"
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#030712] text-white"
    >
      {/* ── Atmosphere ── */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(30,41,59,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.15)_1px,transparent_1px)] bg-size-[72px_72px]"
        style={{
          maskImage: "radial-gradient(ellipse 70% 50% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />
      <div className="pointer-events-none absolute top-0 left-1/2 h-150 w-200 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[160px]" />
      <div className="pointer-events-none absolute top-[15%] right-[15%] h-87.5 w-87.5 rounded-full bg-cyan-500/3 blur-[120px]" />
      <div className="pointer-events-none absolute top-[10%] left-[10%] h-62.5 w-62.5 rounded-full bg-teal-500/3 blur-[100px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-linear-to-t from-[#030712] to-transparent" />

      {/* Screen reader */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {revealed ? "Content revealed" : ""}
      </div>

      {/* ── Confetti burst ── */}
      <AnimatePresence>
        {showConfetti && <ConfettiBurst onComplete={handleConfettiDone} />}
      </AnimatePresence>

      {/* ── LAYER 0: Marketing hero ── */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="mx-auto w-full max-w-5xl px-5 py-32 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={revealed || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            >
              <Badge className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/6 px-4 py-1.5 font-mono text-[10px] tracking-[0.22em] text-emerald-300 uppercase backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                </span>
                ENGINE_STATE: ABSOLUTE
              </Badge>
            </motion.div>

            {/* Provocation echo */}
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={revealed || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
              className="mt-7 font-mono text-sm tracking-wide text-slate-500 sm:text-base"
            >
              Most ledgers are just opinions.
            </motion.p>

            {/* Headline — bloom scale on reveal */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 22, scale: 0.97 }}
              animate={revealed || reduced ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.18, ease: EASE }}
              className="mt-4"
            >
              <h1 className="flex flex-col items-center tracking-tighter">
                <span className="flex items-center gap-4 text-[clamp(3.2rem,10vw,7rem)] leading-[0.85] font-medium text-white">
                  <AfendaMark size={64} variant="animated" />
                  AFENDA
                </span>
                <span className="mt-3 max-w-2xl text-[clamp(1.1rem,3vw,1.8rem)] leading-[1.3] tracking-tight text-slate-400">
                  Where numbers become{" "}
                  <span className="bg-linear-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                    canon
                  </span>
                  .
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={revealed || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.28, ease: EASE }}
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg"
            >
              Forensic-grade ERP. AI-ready. Every approval, posting, correction, and reversal —{" "}
              <span className="text-slate-300">permanently traceable</span>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={revealed || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.38, ease: EASE }}
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
            >
              <Link
                href="/app"
                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-emerald-500 px-8 text-sm font-semibold text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-400 hover:shadow-[0_8px_40px_rgba(16,185,129,0.35)]"
              >
                <span className="relative z-10 flex items-center">
                  Run it now
                  <ChevronRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
                <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/30 px-8 text-sm text-slate-300 backdrop-blur-md transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                View architecture
                <ArrowRight className="ml-2 h-4 w-4 opacity-50" />
              </Link>
            </motion.div>

            {/* System strip */}
            <div className="mt-14 w-full">
              <SystemStrip reduced={reduced} revealed={revealed} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Pillars ── */}
      <div className="relative z-10 border-t border-slate-800/40">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={revealed || reduced ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.7, ease: EASE }}
            className="mb-8 flex items-center justify-center gap-3"
          >
            <div className="h-px max-w-16 flex-1 bg-linear-to-r from-transparent to-emerald-500/20" />
            <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-400/60 uppercase">
              Nothing is overwritten. Everything is remembered.
            </p>
            <div className="h-px max-w-16 flex-1 bg-linear-to-l from-transparent to-emerald-500/20" />
          </motion.div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
            {PILLARS.map((pillar, i) => (
              <PillarCard
                key={pillar.label}
                pillar={pillar}
                index={i}
                reduced={reduced}
                revealed={revealed}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── LAYER 1: The Veil ── */}
      <AnimatePresence>
        {!revealed && !reduced && <Veil onReveal={handleReveal} reduced={reduced} />}
      </AnimatePresence>
    </section>
  );
}

export default Hero;
