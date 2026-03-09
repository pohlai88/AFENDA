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

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
    x: 50 + ((i * 13) % 20 - 10),
    y: 50 + ((i * 7) % 30 - 15),
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
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Central flash */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
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
        className="absolute top-0 bottom-0 w-1 left-1/2"
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
    <div className="relative flex items-center justify-center w-9 h-9">
      <svg width="36" height="36" className="rotate-[-90deg]">
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
      <span className="absolute text-[9px] font-mono text-slate-500 tabular-nums">{secondsLeft}</span>
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
    <div className="absolute right-0 top-0 bottom-0 w-4 pointer-events-none overflow-visible z-10">
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

function Veil({ onReveal, reduced }: { onReveal: () => void; reduced: boolean | null }) {
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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded"
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
        className="absolute inset-x-0 top-0 h-dvh flex flex-col items-center justify-center select-none touch-pan-y overflow-hidden"
      >
        {/* Frosted glass — hero shows through as blurred ghost */}
        <motion.div
          className="absolute inset-0 bg-[#020617]/85"
          style={{ backdropFilter: backdropBlur, WebkitBackdropFilter: backdropBlur }}
        />

        {/* Scan lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(148,163,184,0.5) 2px, rgba(148,163,184,0.5) 3px)",
          }}
        />

        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* Classification stamps */}
        <div className="absolute top-5 left-5 sm:top-6 sm:left-6 flex items-center gap-2 pointer-events-none">
          <Fingerprint className="w-4 h-4 text-slate-700/80" />
          <span className="text-[8px] sm:text-[9px] font-mono text-slate-700/80 tracking-[0.22em] uppercase">
            CLASSIFIED // AUTHORIZED_REVIEW_ONLY
          </span>
        </div>
        <div className="absolute top-5 right-16 sm:top-6 sm:right-20 pointer-events-none hidden sm:block">
          <span className="text-[9px] font-mono text-slate-800/60 tracking-[0.18em]">
            DOC_REF: AFD-2026-001
          </span>
        </div>
        <div className="absolute bottom-20 sm:bottom-6 left-5 sm:left-6 pointer-events-none">
          <span className="text-[8px] sm:text-[9px] font-mono text-slate-800/50 tracking-[0.15em]">
            AFENDA // TRUTH_ENGINE v4.1 // {timerSeconds === 8 ? "COHORT_A" : "COHORT_B"}
          </span>
        </div>

        {/* ── Center provocation ── */}
        <motion.div
          style={{ opacity: contentOpacity }}
          className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex items-center gap-2.5 mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
            <span className="text-emerald-500/40 font-mono text-[10px] sm:text-[11px] tracking-[0.3em] uppercase">
              System.Identify(Self)
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
            className="text-slate-200 text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.15]"
          >
            Most ledgers are just{" "}
            <span className="relative inline-block">
              <span className="text-white font-semibold">opinions</span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-px bg-linear-to-r from-transparent via-emerald-400/60 to-transparent"
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
            className="mt-6 sm:mt-8 text-slate-500 text-sm sm:text-base"
          >
            <span className="italic">Tear away to reveal the truth</span>
            <span className="hidden sm:inline text-slate-700 mx-2">—</span>
            <span className="hidden sm:inline text-slate-600 font-mono text-[11px] tracking-wider">
              or wait {timerSeconds}s
            </span>
          </motion.p>
        </motion.div>

        {/* ── Tear strip — right edge (always visible) ── */}
        <div className="absolute right-0 top-0 bottom-0 w-14 flex flex-col items-center justify-center pointer-events-none">
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
              <ChevronRight className="w-5 h-5 text-emerald-400/70 rotate-180" />
            </motion.div>
            <span
              className="text-[9px] font-mono text-emerald-500/30 tracking-[0.15em]"
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
              <ChevronRight className="w-5 h-5 text-emerald-400/70 rotate-180" />
            </motion.div>
          </div>
        </div>

        {/* Drag-activated glow (intensifies as user drags) */}
        <motion.div
          style={{ opacity: tearGlow }}
          className="absolute right-0 top-0 bottom-0 w-14 pointer-events-none"
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
        <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 flex flex-col items-center gap-3 z-20">
          {/* Drag progress bar */}
          <div className="w-36 h-[3px] rounded-full bg-slate-800/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-emerald-500/80 to-teal-400"
              style={{ scaleX: progressBar, transformOrigin: "left" }}
            />
          </div>

          {/* Reveal button + countdown ring */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <Button
              ref={revealBtnRef}
              variant="outline"
              size="lg"
              onClick={() => onReveal()}
              className="rounded-full border-slate-700/50 bg-slate-900/30 text-slate-300 px-7 backdrop-blur-sm hover:border-emerald-500/40 hover:bg-slate-800/50 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus-visible:ring-emerald-500 focus-visible:ring-offset-slate-950 transition-all"
            >
              <Eye className="w-4 h-4 mr-2 opacity-50" />
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
    <div className="flex items-center gap-2 h-5 overflow-hidden">
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
            <CheckCircle2 className="w-3 h-3 text-teal-500/70 shrink-0" />
          ) : line.status === "warn" ? (
            <Activity className="w-3 h-3 text-amber-500/70 shrink-0" />
          ) : (
            <Zap className="w-3 h-3 text-cyan-500/70 shrink-0" />
          )}
          <span className="text-[11px] text-slate-500 truncate">{line.text}</span>
          <span
            className={`text-[9px] font-mono tracking-wider shrink-0 ${
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
      className="w-full max-w-4xl mx-auto"
    >
      <div className="rounded-2xl border border-slate-800/60 bg-[#080a10]/80 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.02)_inset] overflow-hidden">
        <div className="h-9 bg-[#0c0f17] border-b border-slate-800/50 flex items-center px-4 gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-600 tracking-[0.15em]">
              <Lock className="w-2.5 h-2.5 text-teal-600" />
              TRUTH_ENGINE — LIVE INTEGRITY MONITOR
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400/50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
            </span>
            <span className="text-[9px] font-mono text-teal-500 tracking-wider">LIVE</span>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 sm:justify-between">
          <div className="flex items-center gap-5 sm:gap-6">
            {metrics.map((m, i) => (
              <div key={m.label} className="flex flex-col">
                <span className="text-[9px] font-mono text-slate-600 tracking-[0.15em] uppercase">
                  {m.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                    animate={shouldAnimate || reduced ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.65 + i * 0.08, ease: EASE }}
                    className="text-xl text-white font-semibold tracking-tight"
                  >
                    {m.value}
                  </motion.span>
                  <span className="text-[9px] font-mono text-slate-600">{m.sub}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block w-px h-10 bg-slate-800/60" />
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
                  <Icon className="w-3 h-3 text-teal-600" />
                  <span className="text-[9px] font-mono text-slate-500 tracking-[0.12em]">
                    {mod.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block w-px h-10 bg-slate-800/60" />
          <div className="min-w-0 flex-shrink">
            <FeedTicker reduced={reduced} />
          </div>
        </div>

        <div className="h-px w-full bg-slate-800/40 relative overflow-hidden">
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
      className="group relative rounded-xl border border-slate-800/50 bg-slate-900/20 backdrop-blur-sm p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700/70 hover:bg-slate-900/40"
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/15 bg-teal-500/[0.06] text-teal-400/80 transition-colors group-hover:border-teal-500/30 group-hover:bg-teal-500/10 group-hover:text-teal-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="text-sm text-slate-200 font-medium tracking-tight group-hover:text-white transition-colors">
              {pillar.label}
            </h3>
            <span className="text-[8px] font-mono text-teal-600 tracking-[0.15em] bg-teal-950/30 border border-teal-900/30 rounded px-1.5 py-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
      className="relative min-h-screen overflow-hidden bg-[#030712] text-white flex flex-col"
    >
      {/* ── Atmosphere ── */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(30,41,59,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.15)_1px,transparent_1px)] bg-[size:72px_72px] pointer-events-none"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.05] blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute top-[15%] right-[15%] w-[350px] h-[350px] bg-cyan-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[10%] left-[10%] w-[250px] h-[250px] bg-teal-500/[0.03] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-linear-to-t from-[#030712] to-transparent pointer-events-none z-20" />

      {/* Screen reader */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {revealed ? "Content revealed" : ""}
      </div>

      {/* ── Confetti burst ── */}
      <AnimatePresence>
        {showConfetti && <ConfettiBurst onComplete={handleConfettiDone} />}
      </AnimatePresence>

      {/* ── LAYER 0: Marketing hero ── */}
      <div className="relative flex-1 flex items-center z-10">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8 py-32 lg:py-24">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={revealed || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
            >
              <Badge className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300 backdrop-blur-md">
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
              className="mt-7 text-slate-500 text-sm sm:text-base font-mono tracking-wide"
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
                <span className="flex items-center gap-4 text-[clamp(3.2rem,10vw,7rem)] leading-[0.85] text-white font-medium">
                  <AfendaMark size={64} variant="animated" />
                  AFENDA
                </span>
                <span className="text-[clamp(1.1rem,3vw,1.8rem)] leading-[1.3] mt-3 text-slate-400 tracking-tight max-w-2xl">
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
              className="mt-6 max-w-xl text-base sm:text-lg text-slate-500 leading-relaxed"
            >
              Forensic-grade ERP. AI-ready. Every approval, posting, correction, and
              reversal —{" "}
              <span className="text-slate-300">permanently traceable</span>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={revealed || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.38, ease: EASE }}
              className="mt-10 flex flex-col sm:flex-row items-center gap-3"
            >
              <Link
                href="/auth/signin"
                className="group relative h-12 overflow-hidden rounded-xl bg-emerald-500 px-8 text-sm font-semibold text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-400 hover:shadow-[0_8px_40px_rgba(16,185,129,0.35)] inline-flex items-center justify-center"
              >
                <span className="relative z-10 flex items-center">
                  Run it now
                  <ChevronRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
                <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </Link>
              <Link
                href="#features"
                className="h-12 rounded-xl border border-slate-700/70 bg-slate-900/30 px-8 text-sm text-slate-300 backdrop-blur-md transition-colors hover:bg-slate-800 hover:text-white hover:border-slate-600 inline-flex items-center justify-center"
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
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8 py-10 lg:py-12">
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={revealed || reduced ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.7, ease: EASE }}
            className="mb-8 flex items-center justify-center gap-3"
          >
            <div className="h-px flex-1 max-w-16 bg-linear-to-r from-transparent to-emerald-500/20" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400/60">
              Nothing is overwritten. Everything is remembered.
            </p>
            <div className="h-px flex-1 max-w-16 bg-linear-to-l from-transparent to-emerald-500/20" />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
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
