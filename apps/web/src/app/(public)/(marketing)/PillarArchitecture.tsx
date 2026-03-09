"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { Badge, Button } from "./_landing-ui";
import { Slider } from "@afenda/ui";
import {
  BookOpen,
  GitBranch,
  History,
  Link2,
  Lock,
  RotateCcw,
  Shield,
  Stamp,
  FileCheck2,
  ArrowUp,
  Play,
  Pause,
  RotateCcw as ResetIcon,
  Filter,
  LockKeyhole,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════════
   NORTH STAR ARCHITECTURE
   "Nothing Is Deleted. Everything Is Remembered."
   
   A radial, orbit-based architecture diagram. The North Star (unified truth)
   sits at the center. Concentric orbital rings represent architectural layers:
   financial events orbit outward, each linked to its origin, corrections
   spawn new nodes rather than replacing existing ones, and the entire
   constellation is permanently preserved.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Event data ──────────────────────────────────────────────────────────── */

interface LedgerEvent {
  id: string;
  type: "invoice" | "approval" | "reversal" | "adjustment" | "correction" | "posting";
  label: string;
  shortLabel: string;
  timestamp: string;
  parentId?: string;
  ring: number;   // 0 = innermost, 1, 2 = outer
  angle: number;  // degrees around the orbit
  domain: "INGEST" | "VALIDATE" | "SETTLE" | "AUDIT";
  timestampOrder: number; // For chronological replay
}

const EVENTS: LedgerEvent[] = [
  { id: "E001", type: "invoice",    label: "INV-2024-4281",   shortLabel: "INV",  timestamp: "2024-01-15", ring: 2, angle: 220, domain: "INGEST", timestampOrder: 1 },
  { id: "E002", type: "approval",   label: "APR-CFO-CHEN",   shortLabel: "APR",  timestamp: "2024-01-15", ring: 1, angle: 200, parentId: "E001", domain: "VALIDATE", timestampOrder: 2 },
  { id: "E003", type: "posting",    label: "JNL-GL-00891",   shortLabel: "JNL",  timestamp: "2024-01-16", ring: 0, angle: 180, parentId: "E002", domain: "SETTLE", timestampOrder: 3 },
  { id: "E004", type: "adjustment", label: "ADJ-FX-REVAL",   shortLabel: "ADJ",  timestamp: "2024-03-31", ring: 1, angle: 120, parentId: "E003", domain: "VALIDATE", timestampOrder: 4 },
  { id: "E005", type: "reversal",   label: "REV-4281-A",     shortLabel: "REV",  timestamp: "2024-06-12", ring: 1, angle: 60,  parentId: "E003", domain: "AUDIT", timestampOrder: 5 },
  { id: "E006", type: "correction", label: "COR-4281-B",     shortLabel: "COR",  timestamp: "2024-06-12", ring: 2, angle: 40,  parentId: "E005", domain: "INGEST", timestampOrder: 6 },
  { id: "E007", type: "approval",   label: "APR-AUDIT-LOCK", shortLabel: "SEAL", timestamp: "2024-06-30", ring: 0, angle: 340, parentId: "E006", domain: "AUDIT", timestampOrder: 7 },
  { id: "E008", type: "invoice",    label: "INV-2024-7712",  shortLabel: "INV",  timestamp: "2024-07-01", ring: 2, angle: 310, domain: "INGEST", timestampOrder: 8 },
  { id: "E009", type: "posting",    label: "JNL-GL-01204",   shortLabel: "JNL",  timestamp: "2024-07-02", ring: 0, angle: 290, parentId: "E008", domain: "SETTLE", timestampOrder: 9 },
  { id: "E010", type: "adjustment", label: "ADJ-IC-ELIM",    shortLabel: "ADJ",  timestamp: "2024-09-30", ring: 1, angle: 260, parentId: "E009", domain: "VALIDATE", timestampOrder: 10 },
];

const EVENT_META: Record<LedgerEvent["type"], { color: string; bg: string; border: string; glow: string }> = {
  invoice:    { color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40", glow: "rgba(52,211,153,0.6)"  },
  approval:   { color: "text-teal-400",    bg: "bg-teal-500/15",    border: "border-teal-500/40",    glow: "rgba(20,184,166,0.6)"  },
  posting:    { color: "text-cyan-400",     bg: "bg-cyan-500/15",    border: "border-cyan-500/40",    glow: "rgba(34,211,238,0.6)"  },
  adjustment: { color: "text-amber-400",    bg: "bg-amber-500/15",   border: "border-amber-500/40",   glow: "rgba(245,158,11,0.6)" },
  reversal:   { color: "text-rose-400",     bg: "bg-rose-500/15",    border: "border-rose-500/40",    glow: "rgba(244,63,94,0.6)"  },
  correction: { color: "text-violet-400",   bg: "bg-violet-500/15",  border: "border-violet-500/40",  glow: "rgba(167,139,250,0.6)" },
};

const TYPE_ICON: Record<LedgerEvent["type"], React.ReactNode> = {
  invoice:    <FileCheck2 className="w-3 h-3" />,
  approval:   <Stamp className="w-3 h-3" />,
  posting:    <BookOpen className="w-3 h-3" />,
  adjustment: <RotateCcw className="w-3 h-3" />,
  reversal:   <GitBranch className="w-3 h-3" />,
  correction: <Link2 className="w-3 h-3" />,
};

/* ── Utility: polar to cartesian ─────────────────────────────────────────── */
function polarToXY(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  // Round to 2 decimal places to ensure consistent SSR/client hydration
  const x = Math.round((cx + radius * Math.cos(rad)) * 100) / 100;
  const y = Math.round((cy + radius * Math.sin(rad)) * 100) / 100;
  return { x, y };
}

/* ── Ring radii (responsive via viewBox) ─────────────────────────────────── */
const CX = 400;
const CY = 400;
const RING_RADII = [120, 210, 300]; // inner, mid, outer

/* ── Main Component ──────────────────────────────────────────────────────── */
export function PillarArchitecture() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-150px" });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [autoIdx, setAutoIdx] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [domainFilter, setDomainFilter] = useState<LedgerEvent["domain"] | null>(null);
  const [replayProgress, setReplayProgress] = useState(10); // 1-10, shows events up to this index
  const [isReplaying, setIsReplaying] = useState(false);

  // Auto-cycle highlight through events (paused if locked or replaying)
  useEffect(() => {
    if (!isInView || userInteracted || lockedId || isReplaying) return;
    const timer = setInterval(() => {
      setAutoIdx(prev => (prev + 1) % EVENTS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [isInView, userInteracted, lockedId, isReplaying]);

  const activeId = lockedId || (userInteracted ? hoveredId : EVENTS[autoIdx]?.id ?? null);

  // Filter events by domain
  const visibleEvents = useMemo(() => {
    const baseEvents = domainFilter 
      ? EVENTS.filter(e => e.domain === domainFilter)
      : EVENTS;
    
    // If replaying, only show events up to replay progress
    if (isReplaying) {
      return baseEvents.filter(e => e.timestampOrder <= replayProgress);
    }
    
    return baseEvents;
  }, [domainFilter, isReplaying, replayProgress]);

  // Build lineage chain for active event
  const lineageChain = useMemo(() => {
    const chain = new Set<string>();
    if (!activeId) return chain;
    let current: LedgerEvent | undefined = EVENTS.find(e => e.id === activeId);
    while (current) {
      chain.add(current.id);
      current = current.parentId ? EVENTS.find(e => e.id === current!.parentId) : undefined;
    }
    return chain;
  }, [activeId]);

  // Replay animation
  useEffect(() => {
    if (!isReplaying) return;
    
    const timer = setInterval(() => {
      setReplayProgress(prev => {
        if (prev >= 10) {
          setIsReplaying(false);
          return 10;
        }
        return prev + 1;
      });
    }, 800);
    
    return () => clearInterval(timer);
  }, [isReplaying]);

  // Lineage edges (only for visible events)
  const lineageEdges = useMemo(() => {
    const visibleIds = new Set(visibleEvents.map(e => e.id));
    
    return visibleEvents
      .filter(e => e.parentId && e.ring !== undefined)
      .map(e => {
        const parent = EVENTS.find(p => p.id === e.parentId);
        if (!parent || parent.ring === undefined || !visibleIds.has(parent.id)) return null;
        const from = polarToXY(CX, CY, RING_RADII[e.ring!]!, e.angle);
        const to = polarToXY(CX, CY, RING_RADII[parent.ring!]!, parent.angle);
        const isHighlighted = lineageChain.has(e.id) && lineageChain.has(parent.id);
        return { id: `${e.id}-${parent.id}`, from, to, isHighlighted, type: e.type };
      })
      .filter(Boolean) as Array<{
        id: string;
        from: { x: number; y: number };
        to: { x: number; y: number };
        isHighlighted: boolean;
        type: LedgerEvent["type"];
      }>;
  }, [lineageChain, visibleEvents]);

  function handleHover(id: string | null) {
    if (lockedId) return; // Don't change hover if locked
    setUserInteracted(true);
    setHoveredId(id);
  }

  function handleNodeClick(id: string) {
    setLockedId(prev => prev === id ? null : id); // Toggle lock
    setUserInteracted(true);
  }

  function handleDomainFilter(domain: LedgerEvent["domain"]) {
    setDomainFilter(prev => prev === domain ? null : domain); // Toggle filter
    setLockedId(null);
  }

  function handleReplayStart() {
    setReplayProgress(0);
    setIsReplaying(true);
    setLockedId(null);
    setDomainFilter(null);
  }

  function handleReplayStop() {
    setIsReplaying(false);
    setReplayProgress(10);
  }

  function handleReplayScrub(value: number) {
    setReplayProgress(value);
    if (!isReplaying) {
      setIsReplaying(false); // Keep it paused when manually scrubbing
    }
  }

  // Reset to auto after 8s of no interaction (if not locked)
  useEffect(() => {
    if (!userInteracted || lockedId) return;
    const timer = setTimeout(() => {
      setUserInteracted(false);
      setHoveredId(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [userInteracted, hoveredId, lockedId]);

  return (
    <section
      ref={sectionRef}
      className="py-32 mk-section-alt border-t border-slate-900/80 relative z-10 overflow-hidden"
      id="pillar"
    >
      {/* ── Atmospheric depth ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-teal-900/4 blur-[200px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[300px] h-[400px] bg-cyan-900/3 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-indigo-900/3 blur-[120px] rounded-full pointer-events-none" />

      <div className="mk-container relative z-10">
        {/* ── Header ── */}
        <div className="text-center mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-6 border-teal-900/50 text-teal-400 font-mono tracking-[0.2em] uppercase text-[10px] bg-teal-950/20 px-3 py-1 mx-auto"
            >
              <History className="w-3 h-3 mr-2" />
              North Star Architecture
            </Badge>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-medium text-white tracking-tight mb-4 leading-[1.05]"
          >
            Nothing Is Deleted.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400">
              Everything Is Remembered.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-slate-400 font-light leading-relaxed max-w-3xl mx-auto mt-6"
          >
            The pillar architecture gives finance leadership a visual model of your truth layer.
            Each correction, approval, and reversal becomes{" "}
            <span className="text-white/80">evidence, not overwritten state</span>,
            so audit narratives remain complete under real-world operational pressure.
          </motion.p>
        </div>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 items-start">

          {/* ── LEFT: Properties ── */}
          <div className="lg:col-span-4 space-y-4 order-2 lg:order-1 lg:pr-6">
            {[
              {
                icon: <Lock className="w-4 h-4 text-emerald-400" />,
                iconBg: "bg-emerald-950/50 border-emerald-500/30",
                hoverBorder: "hover:border-emerald-500/20",
                title: "Immutable Ledger Architecture",
                desc: (
                  <>Financial events are append-only. Corrections generate{" "}
                  <span className="text-emerald-400/70">new entries</span> rather
                  than modifying history, preserving a permanent record of
                  economic activity.</>
                ),
              },
              {
                icon: <GitBranch className="w-4 h-4 text-cyan-400" />,
                iconBg: "bg-cyan-950/50 border-cyan-500/30",
                hoverBorder: "hover:border-cyan-500/20",
                title: "Complete Transaction Lineage",
                desc: (
                  <>Every financial event links to its origin. Invoices,
                  approvals, reversals, and adjustments remain{" "}
                  <span className="text-cyan-400/70">permanently traceable</span>.</>
                ),
              },
              {
                icon: <Shield className="w-4 h-4 text-violet-400" />,
                iconBg: "bg-violet-950/50 border-violet-500/30",
                hoverBorder: "hover:border-violet-500/20",
                title: "Audit Narrative Preservation",
                desc: (
                  <>AFENDA maintains the{" "}
                  <span className="text-violet-400/70">full story</span> behind
                  financial decisions, ensuring auditors can reconstruct events
                  years or decades later.</>
                ),
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                className="group"
              >
                <div className={`p-5 rounded-xl border border-slate-800/50 bg-slate-900/20 hover:bg-slate-900/40 ${card.hoverBorder} transition-all duration-500`}>
                  <div className="flex items-start gap-3.5">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBg} transition-all duration-500`}>
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-white tracking-tight mb-1.5">
                        {card.title}
                      </h3>
                      <p className="text-[13px] text-slate-400 font-light leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Closing quote */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="pt-3"
            >
              <p className="text-sm text-slate-500 font-light italic leading-relaxed pl-3 border-l-2 border-teal-500/20">
                "A ledger that will still tell the truth
                <span className="text-teal-400/60"> 100 years</span> from now."
              </p>
            </motion.div>

            {/* Legend */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 1 }}
              className="pt-2"
            >
              <div className="px-4 py-3 rounded-lg border border-slate-800/30 bg-slate-950/40 space-y-2">
                <span className="text-[9px] font-mono text-slate-600 tracking-[0.2em] uppercase">
                  Event Legend
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {(["invoice", "approval", "posting", "adjustment", "reversal", "correction"] as const).map(type => {
                    const m = EVENT_META[type];
                    return (
                      <div key={type} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${m.bg} border ${m.border}`} />
                        <span className={`text-[9px] font-mono ${m.color} tracking-wider uppercase`}>
                          {type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: North Star Orbital Diagram ── */}
          <div className="lg:col-span-8 order-1 lg:order-2 relative flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative w-full max-w-[700px] aspect-square"
            >
              <svg
                viewBox="0 0 800 800"
                className="w-full h-full"
                style={{ overflow: "visible" }}
              >
                <defs>
                  {/* Radial glow for center */}
                  <radialGradient id="ns-core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(45,212,191,0.15)" />
                    <stop offset="60%" stopColor="rgba(45,212,191,0.03)" />
                    <stop offset="100%" stopColor="rgba(45,212,191,0)" />
                  </radialGradient>

                  {/* Subtle grid pattern */}
                  <pattern id="ns-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.03)" strokeWidth="0.5" />
                  </pattern>

                  {/* Glow filter */}
                  <filter id="ns-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <filter id="ns-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background grid */}
                <rect width="800" height="800" fill="url(#ns-grid)" />

                {/* Core glow */}
                <circle cx={CX} cy={CY} r="180" fill="url(#ns-core-glow)" />

                {/* ── ORBITAL RINGS ── */}
                {RING_RADII.map((r, i) => (
                  <React.Fragment key={`ring-${i}`}>
                    {/* Ring track */}
                    <motion.circle
                      cx={CX} cy={CY} r={r}
                      fill="none"
                      stroke={`rgba(148,163,184,${0.06 + i * 0.02})`}
                      strokeWidth="1"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.3 + i * 0.25 }}
                    />
                    {/* Dashed detail ring */}
                    <circle
                      cx={CX} cy={CY} r={r}
                      fill="none"
                      stroke={`rgba(45,212,191,${0.04 + i * 0.01})`}
                      strokeWidth="0.5"
                      strokeDasharray="2 8"
                    />
                    {/* Ring label */}
                    <text
                      x={CX + r + 8} y={CY - 4}
                      className="fill-slate-700 text-[8px] font-mono"
                      style={{ letterSpacing: "0.15em" }}
                    >
                      {i === 0 ? "CORE" : i === 1 ? "PROCESS" : "INGEST"}
                    </text>
                  </React.Fragment>
                ))}

                {/* ── LINEAGE CONNECTIONS ── */}
                {lineageEdges.map(edge => {
                  const meta = EVENT_META[edge.type];
                  // Curved path through center influence - rounded for consistent hydration
                  const mx = Math.round(((edge.from.x + edge.to.x) / 2 + (CX - (edge.from.x + edge.to.x) / 2) * 0.3) * 100) / 100;
                  const my = Math.round(((edge.from.y + edge.to.y) / 2 + (CY - (edge.from.y + edge.to.y) / 2) * 0.3) * 100) / 100;
                  const pathD = `M ${edge.from.x} ${edge.from.y} Q ${mx} ${my} ${edge.to.x} ${edge.to.y}`;

                  return (
                    <React.Fragment key={edge.id}>
                      {/* Base line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={edge.isHighlighted ? meta.glow : "rgba(71,85,105,0.12)"}
                        strokeWidth={edge.isHighlighted ? "2" : "0.8"}
                        strokeDasharray={edge.type === "reversal" || edge.type === "correction" ? "4 4" : "none"}
                        className="transition-all duration-500"
                      />
                      {/* Glow overlay for highlighted */}
                      {edge.isHighlighted && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke={meta.glow}
                          strokeWidth="4"
                          opacity="0.15"
                          className="transition-all duration-500"
                        />
                      )}
                      {/* Animated particle traveling the path */}
                      {edge.isHighlighted && (
                        <circle r="2.5" fill={meta.glow} filter="url(#ns-glow)">
                          <animateMotion
                            dur="2s"
                            repeatCount="indefinite"
                            path={pathD}
                          />
                        </circle>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* ── SLOW-ROTATING SCAN LINE ── */}
                <motion.line
                  x1={CX} y1={CY}
                  x2={CX} y2={CY - RING_RADII[2]! - 20}
                  stroke="rgba(45,212,191,0.08)"
                  strokeWidth="1"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />

                {/* ── EVENT NODES ── */}
                {visibleEvents.map((event, i) => {
                  const pos = polarToXY(CX, CY, RING_RADII[event.ring]!, event.angle);
                  const meta = EVENT_META[event.type];
                  const isActive = lineageChain.has(event.id);
                  const isHovered = activeId === event.id;
                  const isLocked = lockedId === event.id;

                  return (
                    <g
                      key={event.id}
                      onMouseEnter={() => handleHover(event.id)}
                      onMouseLeave={() => handleHover(null)}
                      onClick={() => handleNodeClick(event.id)}
                      className="cursor-pointer"
                    >
                      {/* Hover/active glow ring */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.circle
                            cx={pos.x} cy={pos.y}
                            fill="none"
                            stroke={meta.glow}
                            strokeWidth="1"
                            initial={{ r: 12, opacity: 0 }}
                            animate={{ r: 20, opacity: 0.4 }}
                            exit={{ r: 12, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Locked indicator ring */}
                      {isLocked && (
                        <motion.circle
                          cx={pos.x} cy={pos.y} r="25"
                          fill="none"
                          stroke={meta.glow}
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                        />
                      )}

                      {/* Outer pulse ring for hovered node */}
                      {isHovered && !isLocked && (
                        <motion.circle
                          cx={pos.x} cy={pos.y}
                          fill="none"
                          stroke={meta.glow}
                          strokeWidth="1.5"
                          initial={{ r: 14, opacity: 0.5 }}
                          animate={{ r: [14, 28], opacity: [0.5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}

                      {/* Node body */}
                      <motion.circle
                        cx={pos.x} cy={pos.y}
                        className={`${isActive ? "fill-slate-900" : "fill-slate-950"} transition-all duration-300`}
                        stroke={isActive ? meta.glow : "rgba(71,85,105,0.4)"}
                        strokeWidth={isActive ? "2" : "1"}
                        filter={isActive ? "url(#ns-glow)" : undefined}
                        initial={{ r: 0, opacity: 0 }}
                        animate={{ 
                          r: isActive ? 13 : 10, 
                          opacity: 1,
                          ...(isReplaying && event.timestampOrder === replayProgress ? {
                            scale: [1, 1.3, 1],
                          } : {})
                        }}
                        viewport={{ once: true }}
                        transition={{ 
                          duration: 0.4, 
                          delay: isReplaying ? 0 : 0.5 + i * 0.08 
                        }}
                      />

                      {/* Node icon placeholder — colored inner dot */}
                      <motion.circle
                        cx={pos.x} cy={pos.y}
                        r={isActive ? 4.5 : 3}
                        fill={isActive ? meta.glow : "rgba(148,163,184,0.3)"}
                        className="transition-all duration-300"
                        initial={{ r: 0 }}
                        animate={{ 
                          r: isActive ? 4.5 : 3,
                          ...(isReplaying && event.timestampOrder === replayProgress ? {
                            opacity: [0.3, 1, 0.3, 1],
                          } : {})
                        }}
                        viewport={{ once: true }}
                        transition={{ 
                          duration: 0.3, 
                          delay: isReplaying ? 0 : 0.6 + i * 0.08
                        }}
                      />

                      {/* Short label */}
                      <text
                        x={pos.x}
                        y={pos.y + (event.ring === 0 ? 24 : event.angle > 90 && event.angle < 270 ? 24 : -18)}
                        textAnchor="middle"
                        className={`text-[8px] font-mono tracking-[0.15em] transition-all duration-300 ${
                          isActive ? meta.color.replace("text-", "fill-") : "fill-slate-700"
                        }`}
                      >
                        {event.shortLabel}
                      </text>
                    </g>
                  );
                })}

                {/* ── NORTH STAR CORE ── */}
                {/* Outer ring rotation */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                >
                  <circle cx={CX} cy={CY} r="50" fill="none" stroke="rgba(45,212,191,0.15)" strokeWidth="0.5" strokeDasharray="3 6" />
                </motion.g>

                {/* Inner ring counter-rotation */}
                <motion.g
                  animate={{ rotate: -360 }}
                  transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                >
                  <circle cx={CX} cy={CY} r="35" fill="none" stroke="rgba(45,212,191,0.1)" strokeWidth="0.5" strokeDasharray="2 4" />
                </motion.g>

                {/* Core solid */}
                <circle cx={CX} cy={CY} r="24" fill="rgba(4,6,10,0.9)" stroke="rgba(45,212,191,0.5)" strokeWidth="2" />
                <circle cx={CX} cy={CY} r="24" fill="none" stroke="rgba(45,212,191,0.1)" strokeWidth="8" />

                {/* Core inner diamond */}
                <g style={{ transform: `translate(${CX}px, ${CY}px)` }}>
                  <motion.rect
                    x="-8" y="-8" width="16" height="16" rx="2"
                    fill="rgba(45,212,191,0.15)"
                    stroke="rgba(45,212,191,0.5)"
                    strokeWidth="1"
                    style={{ transform: "rotate(45deg)", transformOrigin: "center" }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                </g>

                {/* Core star flare */}
                <motion.line
                  x1={CX - 18} y1={CY} x2={CX + 18} y2={CY}
                  stroke="rgba(45,212,191,0.4)" strokeWidth="0.5"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.line
                  x1={CX} y1={CY - 18} x2={CX} y2={CY + 18}
                  stroke="rgba(45,212,191,0.4)" strokeWidth="0.5"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                />

                {/* "TRUTH" label at center */}
                <text x={CX} y={CY + 2} textAnchor="middle" className="fill-teal-400 text-[7px] font-mono tracking-[0.3em]" style={{ dominantBaseline: "central" }}>
                  ★
                </text>

                {/* Core label below */}
                <text x={CX} y={CY + 42} textAnchor="middle" className="fill-slate-600 text-[7px] font-mono tracking-[0.2em]">
                  NORTH_STAR
                </text>
                <text x={CX} y={CY + 54} textAnchor="middle" className="fill-teal-500/60 text-[6px] font-mono tracking-[0.15em]">
                  UNIFIED TRUTH
                </text>

                {/* ── Compass tick marks ── */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
                  const inner = polarToXY(CX, CY, RING_RADII[2]! + 8, angle);
                  const outer = polarToXY(CX, CY, RING_RADII[2]! + 16, angle);
                  return (
                    <line
                      key={`tick-${angle}`}
                      x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                      stroke="rgba(148,163,184,0.08)"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Cardinal labels - now clickable filters */}
                {[
                  { angle: 0,   label: "INGEST" as const },
                  { angle: 90,  label: "VALIDATE" as const },
                  { angle: 180, label: "SETTLE" as const },
                  { angle: 270, label: "AUDIT" as const },
                ].map(({ angle, label }) => {
                  const p = polarToXY(CX, CY, RING_RADII[2]! + 32, angle);
                  const isActive = domainFilter === label;
                  const domainEventCount = EVENTS.filter(e => e.domain === label).length;
                  
                  return (
                    <g 
                      key={label}
                      onClick={() => handleDomainFilter(label)}
                      className="cursor-pointer"
                    >
                      {/* Clickable background circle */}
                      <circle
                        cx={p.x} cy={p.y} r="18"
                        fill={isActive ? "rgba(45,212,191,0.1)" : "transparent"}
                        stroke={isActive ? "rgba(45,212,191,0.3)" : "transparent"}
                        strokeWidth="1"
                        className="transition-all duration-300 hover:fill-teal-500/5 hover:stroke-teal-500/20"
                      />
                      
                      {/* Label text */}
                      <text
                        x={p.x} y={p.y - 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`text-[7px] font-mono tracking-[0.2em] transition-all duration-300 pointer-events-none ${
                          isActive ? "fill-teal-400" : "fill-slate-700 group-hover:fill-slate-600"
                        }`}
                      >
                        {label}
                      </text>
                      
                      {/* Event count badge */}
                      <text
                        x={p.x} y={p.y + 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`text-[6px] font-mono transition-all duration-300 pointer-events-none ${
                          isActive ? "fill-teal-500" : "fill-slate-800"
                        }`}
                      >
                        {domainEventCount}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* ── Active event detail tooltip ── */}
              <AnimatePresence>
                {activeId && (() => {
                  const event = EVENTS.find(e => e.id === activeId);
                  if (!event) return null;
                  const meta = EVENT_META[event.type];
                  return (
                    <motion.div
                      key={activeId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.25 }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/95 border border-slate-800/80 rounded-lg px-4 py-2.5 backdrop-blur-xl shadow-2xl pointer-events-none"
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${meta.bg} border ${meta.border} ${meta.color}`}>
                        {TYPE_ICON[event.type]}
                      </div>
                      <div>
                        <div className={`text-[11px] font-mono tracking-[0.1em] ${meta.color}`}>
                          {event.label}
                        </div>
                        <div className="text-[9px] font-mono text-slate-600 tracking-wider">
                          {event.timestamp} • {event.type.toUpperCase()}
                          {event.parentId && (
                            <span className="text-slate-700"> → {event.parentId}</span>
                          )}
                        </div>
                      </div>
                      {lineageChain.size > 1 && (
                        <div className="flex items-center gap-1 ml-2 pl-3 border-l border-slate-800">
                          <ArrowUp className="w-3 h-3 text-teal-500/60" />
                          <span className="text-[9px] font-mono text-teal-500/60 tracking-wider">
                            {lineageChain.size} LINKED
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* ── Replay Timeline Scrubber ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute top-3 left-3 md:top-6 md:left-6 flex flex-col gap-2 pointer-events-auto"
              >
                {/* Control buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={isReplaying ? handleReplayStop : handleReplayStart}
                    className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/50 rounded px-2.5 py-1.5 hover:bg-slate-900/90 hover:border-teal-500/30 transition-all duration-300"
                    title={isReplaying ? "Pause replay" : "Start replay"}
                  >
                    {isReplaying ? (
                      <Pause className="w-3 h-3 text-teal-400" />
                    ) : (
                      <Play className="w-3 h-3 text-teal-400" />
                    )}
                    <span className="text-[8px] font-mono text-slate-500 tracking-[0.15em]">
                      {isReplaying ? "PAUSE" : "REPLAY"}
                    </span>
                  </Button>

                  {lockedId && (
                    <Button
                      variant="ghost"
                      onClick={() => setLockedId(null)}
                      className="flex items-center gap-1.5 bg-teal-950/40 border border-teal-500/30 rounded px-2.5 py-1.5 hover:bg-teal-950/60 transition-all duration-300"
                      title="Unlock node"
                    >
                      <LockKeyhole className="w-3 h-3 text-teal-400" />
                      <span className="text-[8px] font-mono text-teal-400 tracking-[0.15em]">
                        LOCKED
                      </span>
                    </Button>
                  )}

                  {domainFilter && (
                    <Button
                      variant="ghost"
                      onClick={() => setDomainFilter(null)}
                      className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded px-2.5 py-1.5 hover:bg-cyan-950/60 transition-all duration-300"
                      title="Clear domain filter"
                    >
                      <Filter className="w-3 h-3 text-cyan-400" />
                      <span className="text-[8px] font-mono text-cyan-400 tracking-[0.15em]">
                        {domainFilter}
                      </span>
                    </Button>
                  )}
                </div>

                {/* Timeline scrubber */}
                <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800/50 rounded px-3 py-2 backdrop-blur-sm">
                  <span className="text-[7px] font-mono text-slate-600 tracking-[0.15em]">
                    T0
                  </span>
                  <Slider
                    min={0}
                    max={10}
                    value={[replayProgress]}
                    onValueChange={(values) => handleReplayScrub(values[0] ?? 0)}
                    className="w-32 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-slate-800 [&_[data-slot=slider-range]]:bg-teal-500/30 [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:border-teal-400 [&_[data-slot=slider-thumb]]:bg-teal-400 [&_[data-slot=slider-thumb]]:shadow-[0_0_8px_rgba(45,212,191,0.5)] [&_[data-slot=slider-thumb]]:hover:shadow-[0_0_12px_rgba(45,212,191,0.8)]"
                  />
                  <span className="text-[7px] font-mono text-teal-500 tracking-[0.15em] min-w-[20px] text-right">
                    {replayProgress}/{EVENTS.length}
                  </span>
                </div>
              </motion.div>

              {/* ── "100 YEARS" radial marker ── */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 2 }}
                className="absolute top-3 right-3 md:top-6 md:right-6"
              >
                <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/40 rounded px-2.5 py-1.5 backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-[8px] font-mono text-slate-500 tracking-[0.2em]">
                    RETENTION: ∞
                  </span>
                </div>
              </motion.div>

              {/* ── Interaction Guide ── */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="absolute bottom-3 right-3 md:bottom-6 md:right-6 max-w-[200px]"
              >
                <div className="bg-slate-950/80 border border-slate-800/40 rounded px-2.5 py-2 backdrop-blur-sm space-y-1">
                  <div className="text-[7px] font-mono text-slate-600 tracking-[0.2em] uppercase mb-1.5">
                    Interactions
                  </div>
                  <div className="text-[8px] text-slate-500 leading-relaxed space-y-0.5">
                    <div>• Click nodes to lock</div>
                    <div>• Click domains to filter</div>
                    <div>• Use timeline to replay</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
