/* ═══════════════════════════════════════════════════════════════════════
   FEATURES — "Specification Manifest" v3 — CINEMATIC DIAGRAMS
   Every diagram is a metaphorical scene, not a flowchart:
   §01  Geological Strata    — immutable layers of financial bedrock
   §02  Vault Tumblers       — concentric rings clicking into cryptographic seal
   §03  Gravitational Balance — binary-star equilibrium, unbalanced entries ejected
   §04  Synaptic Cascade     — neurons firing an event chain through the nervous system
   §05  River Confluence      — tributaries merging into a single consolidated stream
   §06  Laser Security Grid  — a request descending through layered laser gates
   ═══════════════════════════════════════════════════════════════════ */

"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge, Button } from "./_landing-ui";
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
  XCircle,
  Fingerprint,
  Scale,
  Zap,
  Building2,
  ShieldAlert,
  Play,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Accent = "teal" | "emerald" | "cyan" | "indigo" | "violet" | "rose";

interface Clause {
  id: string;
  title: string;
  proof: string;
  accent: Accent;
  icon: React.ReactNode;
}

// ─── Clause Data ────────────────────────────────────────────────────────────

const CLAUSES: Clause[] = [
  { id: "01", title: "APPEND-ONLY LEDGER",        proof: "Every financial entry is permanently written and immutable. No UPDATE. No DELETE. The past is absolute.",                                                           accent: "teal",    icon: <Lock className="w-3.5 h-3.5" /> },
  { id: "02", title: "CRYPTOGRAPHIC SEAL",         proof: "Each entry is SHA-256 signed the moment it is written. Any downstream tampering invalidates the entire forward chain.",                                              accent: "emerald", icon: <Fingerprint className="w-3.5 h-3.5" /> },
  { id: "03", title: "DOUBLE-ENTRY ENFORCEMENT",   proof: "Debits must equal credits — enforced at engine level before any write commits. Unbalanced entries are rejected at source.",                                         accent: "cyan",    icon: <Scale className="w-3.5 h-3.5" /> },
  { id: "04", title: "REAL-TIME OUTBOX",           proof: "Every mutation emits a transactional outbox event. Side effects are guaranteed, ordered, and idempotent across all entities.",                                      accent: "indigo",  icon: <Zap className="w-3.5 h-3.5" /> },
  { id: "05", title: "MULTI-ENTITY CONSOLIDATION", proof: "Subsidiary, regional, and group rollups happen continuously in real time — not at period-end close.",                                                              accent: "violet",  icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: "06", title: "ZERO-TRUST RBAC",            proof: "Every read and write passes org-scoped permission gates. Row-level security is enforced at the database layer, not the application layer.",                         accent: "rose",    icon: <ShieldAlert className="w-3.5 h-3.5" /> },
];

const ACCENT_STYLES: Record<Accent, {
  text: string; bar: string; dot: string;
  iconBg: string; iconBorder: string;
  glowFrom: string; glowVia: string;
}> = {
  teal:    { text: "text-teal-400",    bar: "bg-teal-500",    dot: "bg-teal-400",    iconBg: "bg-teal-950/50",    iconBorder: "border-teal-500/40",    glowFrom: "from-teal-500/8",    glowVia: "via-teal-900/4"    },
  emerald: { text: "text-emerald-400", bar: "bg-emerald-500", dot: "bg-emerald-400", iconBg: "bg-emerald-950/50", iconBorder: "border-emerald-500/40", glowFrom: "from-emerald-500/8", glowVia: "via-emerald-900/4" },
  cyan:    { text: "text-cyan-400",    bar: "bg-cyan-500",    dot: "bg-cyan-400",    iconBg: "bg-cyan-950/50",    iconBorder: "border-cyan-500/40",    glowFrom: "from-cyan-500/8",    glowVia: "via-cyan-900/4"    },
  indigo:  { text: "text-indigo-400",  bar: "bg-indigo-500",  dot: "bg-indigo-400",  iconBg: "bg-indigo-950/50",  iconBorder: "border-indigo-500/40",  glowFrom: "from-indigo-500/8",  glowVia: "via-indigo-900/4"  },
  violet:  { text: "text-violet-400",  bar: "bg-violet-500",  dot: "bg-violet-400",  iconBg: "bg-violet-950/50",  iconBorder: "border-violet-500/40",  glowFrom: "from-violet-500/8",  glowVia: "via-violet-900/4"  },
  rose:    { text: "text-rose-400",    bar: "bg-rose-500",    dot: "bg-rose-400",    iconBg: "bg-rose-950/50",    iconBorder: "border-rose-500/40",    glowFrom: "from-rose-500/8",    glowVia: "via-rose-900/4"    },
};

/* ═══════════════════════════════════════════════════════════════════════
   §01 — GEOLOGICAL STRATA
   Financial events are sedimentary rock. Each layer compresses, never
   erodes. A drill (DELETE) tries to reach a deep layer and is deflected.
   ═══════════════════════════════════════════════════════════════════ */

const STRATA = [
  { label: "AUDIT/SEALED",      age: "2024 Q4", color: "#0d9488", pattern: "dense"  },
  { label: "GL/POSTED",         age: "2024 Q3", color: "#14b8a6", pattern: "medium" },
  { label: "AP/APPROVED",       age: "2024 Q2", color: "#2dd4bf", pattern: "sparse" },
  { label: "INV/RECEIVED",      age: "2024 Q1", color: "#5eead4", pattern: "dense"  },
  { label: "PO/COMMITTED",      age: "2023 Q4", color: "#99f6e4", pattern: "medium" },
];

function DiagramStrata() {
  const [layers, setLayers] = useState(0);
  const [drill, setDrill] = useState(false);
  const [deflected, setDeflected] = useState(false);

  useEffect(() => {
    STRATA.forEach((_, i) => setTimeout(() => setLayers(i + 1), 400 + i * 500));
    const t1 = setTimeout(() => setDrill(true), 3200);
    const t2 = setTimeout(() => setDeflected(true), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const cx = 250, totalH = 340;
  const layerH = 48;
  const baseY = totalH - 40;

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg viewBox="0 0 500 400" className="w-full h-full max-h-[480px]">
        <defs>
          {/* Noise texture for geological feel */}
          <filter id="strata-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
          </filter>
          <filter id="strata-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Hatch patterns */}
          <pattern id="hatch-dense" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <pattern id="hatch-medium" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(-30)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
          <pattern id="hatch-sparse" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(60)">
            <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Bedrock base */}
        <rect x="60" y={baseY} width="380" height="30" rx="2" fill="rgba(15,23,42,0.8)" stroke="rgba(71,85,105,0.3)" strokeWidth="1" />
        <text x={cx} y={baseY + 18} textAnchor="middle" className="text-[8px] font-mono" fill="rgba(100,116,139,0.5)" style={{ letterSpacing: "0.3em" }}>BEDROCK // GENESIS</text>

        {/* Sedimentary strata */}
        {STRATA.slice(0, layers).map((s, i) => {
          const y = baseY - (i + 1) * layerH;
          const patternId = `hatch-${s.pattern}`;
          return (
            <motion.g key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Layer body */}
              <rect x="60" y={y} width="380" height={layerH - 4} rx="3"
                fill={s.color} opacity="0.12" />
              <rect x="60" y={y} width="380" height={layerH - 4} rx="3"
                fill={`url(#${patternId})`} />
              {/* Left edge accent */}
              <rect x="60" y={y} width="3" height={layerH - 4} rx="1"
                fill={s.color} opacity="0.5" />
              {/* Compression lines */}
              {[0.25, 0.5, 0.75].map(frac => (
                <line key={frac} x1={60 + 380 * frac} y1={y + 2} x2={60 + 380 * frac} y2={y + layerH - 6}
                  stroke={s.color} strokeWidth="0.5" opacity="0.08" />
              ))}
              {/* Label */}
              <text x={80} y={y + layerH / 2} dominantBaseline="central"
                className="text-[9px] font-mono" fill={s.color} opacity="0.8"
                style={{ letterSpacing: "0.12em" }}>
                {s.label}
              </text>
              {/* Age marker */}
              <text x={420} y={y + layerH / 2} dominantBaseline="central" textAnchor="end"
                className="text-[8px] font-mono" fill={s.color} opacity="0.4">
                {s.age}
              </text>
              {/* Settling particles */}
              {[...Array(3)].map((_, pi) => (
                <motion.circle
                  key={pi}
                  cx={120 + pi * 120}
                  r="1.5"
                  fill={s.color}
                  initial={{ cy: y - 10, opacity: 0 }}
                  animate={{ cy: y + layerH - 6, opacity: 0.3 }}
                  transition={{ duration: 1.5, delay: pi * 0.3 }}
                />
              ))}
            </motion.g>
          );
        })}

        {/* Drill / DELETE attempt */}
        {drill && (
          <motion.g>
            {/* Drill shaft */}
            <motion.line
              x1={cx + 80} y1={20} x2={cx + 80}
              y2={deflected ? baseY - 3 * layerH : baseY - layerH}
              stroke="#f43f5e" strokeWidth="2" strokeDasharray="6 3"
              initial={{ y2: 20 }}
              animate={{ y2: deflected ? baseY - 3 * layerH + 20 : baseY - layerH }}
              transition={{ duration: 0.8 }}
            />
            {/* Drill head */}
            <motion.polygon
              points={`${cx + 76},${baseY - 3 * layerH + 20} ${cx + 84},${baseY - 3 * layerH + 20} ${cx + 80},${baseY - 3 * layerH + 30}`}
              fill="#f43f5e" opacity={deflected ? 0.3 : 0.8}
              animate={deflected ? { y: -30, opacity: 0.2 } : {}}
              transition={{ duration: 0.4 }}
            />
            {/* Drill label */}
            <text x={cx + 92} y={40} className="text-[8px] font-mono" fill="#f43f5e" opacity="0.7"
              style={{ letterSpacing: "0.15em" }}>
              DELETE
            </text>
          </motion.g>
        )}

        {/* Deflection sparks */}
        {deflected && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              return (
                <motion.circle
                  key={i}
                  r="2"
                  fill="#f43f5e"
                  initial={{ cx: cx + 80, cy: baseY - 3 * layerH + 20, opacity: 1 }}
                  animate={{
                    cx: cx + 80 + Math.cos(angle) * 40,
                    cy: baseY - 3 * layerH + 20 + Math.sin(angle) * 25,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              );
            })}
            {/* REJECTED label */}
            <motion.text
              x={cx + 80} y={baseY - 3 * layerH - 10}
              textAnchor="middle"
              className="text-[9px] font-mono font-bold"
              fill="#f43f5e"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ letterSpacing: "0.2em" }}
            >
              DEFLECTED
            </motion.text>
          </motion.g>
        )}

        {/* Depth axis */}
        <line x1="45" y1={baseY + 25} x2="45" y2={baseY - 5 * layerH - 10} stroke="rgba(100,116,139,0.15)" strokeWidth="1" />
        <text x="42" y={baseY - 5 * layerH - 16} textAnchor="end" className="text-[7px] font-mono" fill="rgba(100,116,139,0.3)" style={{ letterSpacing: "0.15em" }}>DEPTH</text>

        {/* Bottom label */}
        <text x={cx} y={totalH - 4} textAnchor="middle" className="text-[8px] font-mono" fill="rgba(20,184,166,0.4)" style={{ letterSpacing: "0.2em" }}>
          IMMUTABLE STRATA // NO EROSION
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   §02 — VAULT TUMBLERS
   Concentric rotating rings that click into cryptographic alignment.
   Tamper attempt misaligns a ring, breaking the entire seal.
   ═══════════════════════════════════════════════════════════════════ */

const TUMBLER_RINGS = [
  { r: 120, segments: 12, speed: 22, label: "OUTER" },
  { r: 90,  segments: 8,  speed: -18, label: "MID" },
  { r: 60,  segments: 6,  speed: 15,  label: "INNER" },
];

function DiagramVault() {
  const [phase, setPhase] = useState(0);
  // 0: spinning, 1: aligning, 2: sealed, 3: tamper, 4: broken

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => setPhase(3), 4600);
    const t4 = setTimeout(() => setPhase(4), 5400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const cx = 250, cy = 200;

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg viewBox="0 0 500 400" className="w-full h-full max-h-[480px]">
        <defs>
          <filter id="vault-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="vault-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={phase >= 2 && phase < 4 ? "rgba(52,211,153,0.2)" : phase >= 4 ? "rgba(244,63,94,0.15)" : "rgba(52,211,153,0.05)"} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Core glow */}
        <circle cx={cx} cy={cy} r="150" fill="url(#vault-core-glow)" />

        {/* Tumbler rings */}
        {TUMBLER_RINGS.map((ring, ri) => {
          const isBroken = phase >= 4 && ri === 1;
          const color = isBroken ? "#f43f5e" : phase >= 2 ? "#34d399" : "#64748b";
          const segAngle = 360 / ring.segments;

          return (
            <motion.g
              key={ri}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              animate={
                phase === 0
                  ? { rotate: [0, ring.speed > 0 ? 360 : -360] }
                  : isBroken
                  ? { rotate: 23 }
                  : { rotate: 0 }
              }
              transition={
                phase === 0
                  ? { duration: Math.abs(ring.speed), repeat: Infinity, ease: "linear" }
                  : { duration: 0.8, type: "spring", stiffness: 100, damping: 15 }
              }
            >
              {/* Ring track */}
              <circle cx={cx} cy={cy} r={ring.r} fill="none"
                stroke={color} strokeWidth="1.5" opacity={phase >= 2 ? 0.4 : 0.15}
                strokeDasharray={`${segAngle * ring.r * Math.PI / 180 - 4} 4`}
                className="transition-all duration-700"
              />

              {/* Segment notches */}
              {[...Array(ring.segments)].map((_, si) => {
                const a = (si * segAngle - 90) * Math.PI / 180;
                const x1 = cx + (ring.r - 8) * Math.cos(a);
                const y1 = cy + (ring.r - 8) * Math.sin(a);
                const x2 = cx + (ring.r + 8) * Math.cos(a);
                const y2 = cy + (ring.r + 8) * Math.sin(a);
                const isKeySlot = si === 0;
                return (
                  <line key={si} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isKeySlot ? (isBroken ? "#f43f5e" : color) : color}
                    strokeWidth={isKeySlot ? 3 : 1}
                    opacity={isKeySlot ? (phase >= 2 ? 0.9 : 0.4) : 0.15}
                    className="transition-all duration-500"
                  />
                );
              })}

              {/* Ring label */}
              <text x={cx + ring.r + 16} y={cy + 4} className="text-[7px] font-mono"
                fill={color} opacity="0.5" style={{ letterSpacing: "0.15em" }}>
                {ring.label}
              </text>
            </motion.g>
          );
        })}

        {/* Central seal */}
        <motion.circle
          cx={cx} cy={cy} r="30"
          fill={phase >= 4 ? "rgba(244,63,94,0.1)" : phase >= 2 ? "rgba(52,211,153,0.1)" : "rgba(15,23,42,0.8)"}
          stroke={phase >= 4 ? "#f43f5e" : phase >= 2 ? "#34d399" : "#475569"}
          strokeWidth={phase >= 2 ? 3 : 1.5}
          filter={phase >= 2 ? "url(#vault-glow)" : undefined}
          className="transition-all duration-700"
        />

        {/* Seal icon */}
        {phase >= 2 && phase < 4 && (
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <text x={cx} y={cy + 5} textAnchor="middle" className="text-[16px]" fill="#34d399">
              ✦
            </text>
          </motion.g>
        )}
        {phase >= 4 && (
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <text x={cx} y={cy + 5} textAnchor="middle" className="text-[16px]" fill="#f43f5e">
              ✕
            </text>
          </motion.g>
        )}

        {/* Alignment indicators */}
        {phase >= 1 && phase < 4 && (
          <motion.line x1={cx} y1={cy - 135} x2={cx} y2={cy - 45}
            stroke="#34d399" strokeWidth="1" opacity="0.3"
            initial={{ opacity: 0 }} animate={{ opacity: 0.3 }}
          />
        )}

        {/* Status */}
        <motion.text
          x={cx} y={370}
          textAnchor="middle"
          className="text-[9px] font-mono"
          fill={phase >= 4 ? "#f43f5e" : phase >= 2 ? "#34d399" : "#64748b"}
          style={{ letterSpacing: "0.2em" }}
          key={phase >= 4 ? "broken" : phase >= 2 ? "sealed" : "spinning"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {phase >= 4 ? "TAMPER_DETECTED // SEAL_BROKEN" : phase >= 2 ? "SEALED // TUMBLERS_ALIGNED" : "ALIGNING TUMBLERS..."}
        </motion.text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   §03 — GRAVITATIONAL BALANCE
   Two masses (DR / CR) orbit a central fulcrum. Entries add mass.
   When balanced they form a stable binary system. Unbalanced entry
   gets gravitationally ejected.
   ═══════════════════════════════════════════════════════════════════ */

function DiagramGravity() {
  const [entries, setEntries] = useState(0);
  const [ejected, setEjected] = useState(false);
  const [balanced, setBalanced] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setEntries(1), 600);   // DR +24k
    const t1 = setTimeout(() => setEntries(2), 1400);  // DR +18k
    const t2 = setTimeout(() => setEntries(3), 2200);  // CR +42k — balance!
    const t3 = setTimeout(() => setBalanced(true), 2800);
    const t4 = setTimeout(() => setEntries(4), 3800);  // unbalanced attempt
    const t5 = setTimeout(() => setEjected(true), 4400);
    return () => [t0, t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  const cx = 250, cy = 180;
  const drMass = entries >= 1 ? 24 + (entries >= 2 ? 18 : 0) : 0;
  const crMass = entries >= 3 ? 42 : 0;
  const drR = 20 + drMass * 0.3;
  const crR = 20 + crMass * 0.3;

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg viewBox="0 0 500 400" className="w-full h-full max-h-[480px]">
        <defs>
          <radialGradient id="grav-dr" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.3)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0.05)" />
          </radialGradient>
          <radialGradient id="grav-cr" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(129,140,248,0.3)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0.05)" />
          </radialGradient>
          <filter id="grav-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Orbital path */}
        <ellipse cx={cx} cy={cy} rx="160" ry="60" fill="none"
          stroke="rgba(100,116,139,0.08)" strokeWidth="1" strokeDasharray="4 6" />

        {/* Gravitational field lines */}
        {[80, 120, 160].map(r => (
          <ellipse key={r} cx={cx} cy={cy} rx={r} ry={r * 0.375} fill="none"
            stroke="rgba(100,116,139,0.04)" strokeWidth="0.5" />
        ))}

        {/* Balance beam */}
        <motion.line
          x1={cx - 130} y1={cy}
          x2={cx + 130} y2={cy}
          stroke={balanced ? "rgba(45,212,191,0.3)" : "rgba(100,116,139,0.15)"}
          strokeWidth="1.5"
          className="transition-colors duration-700"
        />

        {/* Fulcrum */}
        <polygon points={`${cx - 8},${cy + 2} ${cx + 8},${cy + 2} ${cx},${cy + 18}`}
          fill="rgba(100,116,139,0.15)" stroke="rgba(100,116,139,0.2)" strokeWidth="1" />

        {/* DR mass (left) */}
        <motion.g
          animate={{ y: balanced ? 0 : entries < 3 ? 15 : 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 10 }}
        >
          {/* Glow */}
          <circle cx={cx - 120} cy={cy} r={drR + 10} fill="url(#grav-dr)" filter="url(#grav-glow)" />
          {/* Body */}
          <motion.circle
            cx={cx - 120} cy={cy} r={drR}
            fill="rgba(34,211,238,0.08)"
            stroke="rgba(34,211,238,0.5)"
            strokeWidth="2"
            animate={{ r: drR }}
            transition={{ type: "spring", stiffness: 100 }}
          />
          {/* DR label */}
          <text x={cx - 120} y={cy - 6} textAnchor="middle"
            className="text-[10px] font-mono font-bold" fill="#22d3ee" style={{ letterSpacing: "0.1em" }}>
            DR
          </text>
          <text x={cx - 120} y={cy + 8} textAnchor="middle"
            className="text-[8px] font-mono" fill="#22d3ee" opacity="0.6">
            {drMass > 0 ? `$${drMass}K` : "—"}
          </text>
          {/* Orbiting particles */}
          {entries >= 1 && (
            <motion.circle cx={cx - 120} cy={cy} r="1.5" fill="#22d3ee"
              animate={{ cx: [cx - 120 - drR - 8, cx - 120 + drR + 8, cx - 120 - drR - 8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              opacity="0.4"
            />
          )}
        </motion.g>

        {/* CR mass (right) */}
        <motion.g
          animate={{ y: balanced ? 0 : entries < 3 ? -8 : 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 10 }}
        >
          <circle cx={cx + 120} cy={cy} r={crR + 10} fill="url(#grav-cr)" filter="url(#grav-glow)" />
          <motion.circle
            cx={cx + 120} cy={cy} r={crR}
            fill="rgba(129,140,248,0.08)"
            stroke="rgba(129,140,248,0.5)"
            strokeWidth="2"
            animate={{ r: crR }}
            transition={{ type: "spring", stiffness: 100 }}
          />
          <text x={cx + 120} y={cy - 6} textAnchor="middle"
            className="text-[10px] font-mono font-bold" fill="#818cf8" style={{ letterSpacing: "0.1em" }}>
            CR
          </text>
          <text x={cx + 120} y={cy + 8} textAnchor="middle"
            className="text-[8px] font-mono" fill="#818cf8" opacity="0.6">
            {crMass > 0 ? `$${crMass}K` : "—"}
          </text>
          {entries >= 3 && (
            <motion.circle cx={cx + 120} cy={cy} r="1.5" fill="#818cf8"
              animate={{ cy: [cy - crR - 8, cy + crR + 8, cy - crR - 8] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
              opacity="0.4"
            />
          )}
        </motion.g>

        {/* Balance equilibrium indicator */}
        {balanced && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <text x={cx} y={cy - 20} textAnchor="middle"
              className="text-[8px] font-mono" fill="#2dd4bf" opacity="0.6" style={{ letterSpacing: "0.15em" }}>
              EQUILIBRIUM
            </text>
            <motion.circle cx={cx} cy={cy} r="5" fill="none" stroke="#2dd4bf" strokeWidth="1.5"
              animate={{ r: [5, 20, 5], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.g>
        )}

        {/* Ejected unbalanced entry */}
        {entries >= 4 && (
          <motion.g>
            <motion.circle
              cx={cx - 60} cy={cy + 60}
              r="8"
              fill="rgba(244,63,94,0.15)"
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              animate={ejected
                ? { cx: cx - 60 - 120, cy: cy + 60 + 80, opacity: 0, r: 4 }
                : { cx: cx - 60, cy: cy + 60 }
              }
              transition={{ duration: 1.2, ease: "easeIn" }}
            />
            <motion.text
              x={cx - 60} y={cy + 64}
              textAnchor="middle"
              className="text-[7px] font-mono" fill="#f43f5e"
              animate={ejected ? { x: cx - 180, y: cy + 140, opacity: 0 } : {}}
              transition={{ duration: 1.2 }}
            >
              +$5K
            </motion.text>
            {/* Ejection trail */}
            {ejected && (
              <motion.path
                d={`M ${cx - 60} ${cy + 60} Q ${cx - 100} ${cy + 90} ${cx - 180} ${cy + 140}`}
                fill="none" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3"
                initial={{ pathLength: 0, opacity: 0.5 }}
                animate={{ pathLength: 1, opacity: 0 }}
                transition={{ duration: 1.5 }}
              />
            )}
          </motion.g>
        )}

        {/* Status */}
        <text x={cx} y={360} textAnchor="middle"
          className="text-[9px] font-mono"
          fill={ejected ? "#f43f5e" : balanced ? "#2dd4bf" : "#64748b"}
          style={{ letterSpacing: "0.2em" }}>
          {ejected ? "UNBALANCED_ENTRY — EJECTED" : balanced ? "DR = CR // STABLE ORBIT" : "ACQUIRING BALANCE..."}
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   §04 — SYNAPTIC CASCADE
   Neurons fire in sequence, sending light pulses along axons.
   The event-driven architecture as a living nervous system.
   ═══════════════════════════════════════════════════════════════════ */

const NEURONS = [
  { x: 60,  y: 100, label: "CMD",    color: "#818cf8" },
  { x: 170, y: 180, label: "WRITE",  color: "#2dd4bf" },
  { x: 280, y: 100, label: "OUTBOX", color: "#818cf8" },
  { x: 370, y: 200, label: "WORKER", color: "#a78bfa" },
  { x: 440, y: 110, label: "EFFECT", color: "#34d399" },
];

const SYNAPSES = [
  [0, 1], [1, 2], [2, 3], [2, 4], [3, 4],
] as const;

function DiagramSynaptic() {
  const [fired, setFired] = useState(-1);

  useEffect(() => {
    NEURONS.forEach((_, i) => {
      setTimeout(() => setFired(i), 600 + i * 700);
    });
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg viewBox="0 0 500 320" className="w-full h-full max-h-[480px]">
        <defs>
          <filter id="syn-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="syn-pulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Dendrite background fibers */}
        {[...Array(12)].map((_, i) => {
          const x1 = 20 + (i % 4) * 130;
          const y1 = 30 + Math.floor(i / 4) * 100;
          const x2 = x1 + 60 + ((i * 37) % 40);
          const y2 = y1 + 40 + ((i * 23) % 30);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(100,116,139,0.04)" strokeWidth="0.5" />
          );
        })}

        {/* Synaptic connections (axons) */}
        {SYNAPSES.map(([from, to], si) => {
          const n1 = NEURONS[from];
          const n2 = NEURONS[to];
          if (!n1 || !n2) return null;
          const mx = (n1.x + n2.x) / 2 + (si % 2 === 0 ? 20 : -20);
          const my = (n1.y + n2.y) / 2 + (si % 2 === 0 ? -25 : 25);
          const pathD = `M ${n1.x} ${n1.y} Q ${mx} ${my} ${n2.x} ${n2.y}`;
          const isActive = fired >= from && fired >= to - 1;
          const isTransmitting = fired === from || fired === from + 1;

          return (
            <React.Fragment key={si}>
              {/* Axon path */}
              <motion.path
                d={pathD} fill="none"
                stroke={isActive ? n1.color : "rgba(71,85,105,0.12)"}
                strokeWidth={isActive ? 2 : 1}
                opacity={isActive ? 0.5 : 0.2}
                className="transition-all duration-500"
              />
              {/* Traveling signal pulse */}
              {isTransmitting && (
                <circle r="4" fill={n1.color} filter="url(#syn-glow)" opacity="0.9">
                  <animateMotion dur="0.7s" repeatCount="1" path={pathD} fill="freeze" />
                </circle>
              )}
            </React.Fragment>
          );
        })}

        {/* Neurons */}
        {NEURONS.map((n, i) => {
          const isFired = fired >= i;
          const isFiring = fired === i;
          return (
            <g key={i}>
              {/* Firing burst */}
              {isFiring && (
                <motion.circle
                  cx={n.x} cy={n.y} r="20"
                  fill={n.color} filter="url(#syn-pulse)"
                  initial={{ r: 10, opacity: 0.6 }}
                  animate={{ r: 45, opacity: 0 }}
                  transition={{ duration: 0.8 }}
                />
              )}
              {/* Soma (cell body) */}
              <motion.circle
                cx={n.x} cy={n.y}
                r={isFired ? 18 : 14}
                fill={isFired ? `${n.color}15` : "rgba(15,23,42,0.8)"}
                stroke={isFired ? n.color : "rgba(71,85,105,0.3)"}
                strokeWidth={isFired ? 2.5 : 1}
                filter={isFired ? "url(#syn-glow)" : undefined}
                className="transition-all duration-500"
              />
              {/* Nucleus */}
              <motion.circle
                cx={n.x} cy={n.y}
                r={isFired ? 6 : 4}
                fill={isFired ? n.color : "rgba(71,85,105,0.2)"}
                opacity={isFired ? 0.8 : 0.3}
                className="transition-all duration-500"
              />
              {/* Label */}
              <text x={n.x} y={n.y + 32} textAnchor="middle"
                className="text-[8px] font-mono"
                fill={isFired ? n.color : "rgba(100,116,139,0.3)"}
                style={{ letterSpacing: "0.15em" }}
                opacity={isFired ? 0.8 : 0.3}>
                {n.label}
              </text>
            </g>
          );
        })}

        {/* Status */}
        {fired >= NEURONS.length - 1 && (
          <motion.text
            x={250} y={300}
            textAnchor="middle"
            className="text-[9px] font-mono"
            fill="#34d399"
            style={{ letterSpacing: "0.2em" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            CASCADE_COMPLETE // ALL_EFFECTS_FIRED
          </motion.text>
        )}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   §05 — RIVER CONFLUENCE
   Tributaries (subsidiaries) merge into a single great river.
   Data particles flow along the currents and blend at the confluence.
   ═══════════════════════════════════════════════════════════════════ */

const TRIBUTARIES = [
  { label: "EMEA", amount: "€4.2M", color: "#a78bfa", path: "M 40 60 Q 100 80 180 160 Q 220 190 250 200" },
  { label: "APAC", amount: "$9.1M", color: "#2dd4bf", path: "M 460 50 Q 400 70 320 140 Q 280 170 250 200" },
  { label: "AMER", amount: "$6.7M", color: "#818cf8", path: "M 40 320 Q 120 300 180 260 Q 220 230 250 200" },
];

const MAIN_RIVER = "M 250 200 Q 300 240 350 260 Q 400 280 460 300";

function DiagramRiver() {
  const [phase, setPhase] = useState(0);
  // 0: tributaries appearing, 1: particles flowing, 2: merged

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000);
    const t2 = setTimeout(() => setPhase(2), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg viewBox="0 0 500 380" className="w-full h-full max-h-[480px]">
        <defs>
          <filter id="river-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="river-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Confluence pool gradient */}
          <radialGradient id="confluence-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={phase >= 2 ? "rgba(45,212,191,0.2)" : "rgba(45,212,191,0.05)"} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Terrain texture — faint contour lines */}
        {[100, 150, 200, 250, 300].map(y => (
          <line key={y} x1="20" y1={y} x2="480" y2={y}
            stroke="rgba(100,116,139,0.03)" strokeWidth="0.5" />
        ))}

        {/* Tributary streams */}
        {TRIBUTARIES.map((trib, i) => (
          <React.Fragment key={trib.label}>
            {/* Stream glow */}
            <motion.path
              d={trib.path} fill="none"
              stroke={trib.color} strokeWidth="12" opacity="0.04"
              filter="url(#river-blur)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: i * 0.3 }}
            />
            {/* Stream body */}
            <motion.path
              d={trib.path} fill="none"
              stroke={trib.color} strokeWidth="3"
              strokeLinecap="round"
              opacity={phase >= 2 ? 0.4 : 0.6}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: i * 0.3 }}
              className="transition-opacity duration-700"
            />
            {/* Stream center line */}
            <motion.path
              d={trib.path} fill="none"
              stroke={trib.color} strokeWidth="1"
              strokeLinecap="round" opacity="0.8"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: i * 0.3 }}
            />

            {/* Data particles flowing */}
            {phase >= 1 && [...Array(3)].map((_, pi) => (
              <circle key={pi} r="3" fill={trib.color} opacity="0.7" filter="url(#river-glow)">
                <animateMotion
                  dur={`${2 + pi * 0.5}s`}
                  repeatCount="indefinite"
                  path={trib.path}
                  begin={`${pi * 0.6}s`}
                />
              </circle>
            ))}

            {/* Source label */}
            {(() => {
              const pathParts = trib.path.split(" ");
              const isLeft = trib.path.startsWith("M 40");
              const yCoord = pathParts[2] || "100";
              const isTop = parseInt(yCoord, 10) < 100;
              const lx = isLeft ? 30 : 470;
              const ly = parseInt(yCoord, 10);
              return (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.3 }}>
                  <circle cx={lx} cy={ly} r="16" fill="rgba(15,23,42,0.8)" stroke={trib.color} strokeWidth="1.5" />
                  <text x={lx} y={ly - 2} textAnchor="middle" className="text-[7px] font-mono font-bold" fill={trib.color} style={{ letterSpacing: "0.08em" }}>
                    {trib.label}
                  </text>
                  <text x={lx} y={ly + 8} textAnchor="middle" className="text-[6px] font-mono" fill={trib.color} opacity="0.6">
                    {trib.amount}
                  </text>
                </motion.g>
              );
            })()}
          </React.Fragment>
        ))}

        {/* Confluence point */}
        <circle cx={250} cy={200} r="40" fill="url(#confluence-glow)" />

        {/* Main river (outflow) */}
        <motion.path
          d={MAIN_RIVER} fill="none"
          stroke="#2dd4bf" strokeWidth="5" strokeLinecap="round"
          opacity={phase >= 2 ? 0.5 : 0.1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 1.5 }}
        />
        <motion.path
          d={MAIN_RIVER} fill="none"
          stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"
          opacity={phase >= 2 ? 0.9 : 0.1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 1.5 }}
        />

        {/* Merged particles in main river */}
        {phase >= 2 && [...Array(4)].map((_, pi) => (
          <circle key={pi} r="3.5" fill="#2dd4bf" opacity="0.6" filter="url(#river-glow)">
            <animateMotion dur={`${2.5 + pi * 0.4}s`} repeatCount="indefinite" path={MAIN_RIVER} begin={`${pi * 0.5}s`} />
          </circle>
        ))}

        {/* Consolidated output label */}
        {phase >= 2 && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <circle cx={460} cy={300} r="22" fill="rgba(15,23,42,0.9)" stroke="#2dd4bf" strokeWidth="2" filter="url(#river-glow)" />
            <text x={460} y={296} textAnchor="middle" className="text-[7px] font-mono font-bold" fill="#2dd4bf" style={{ letterSpacing: "0.1em" }}>
              GLOBAL
            </text>
            <text x={460} y={308} textAnchor="middle" className="text-[8px] font-mono" fill="#5eead4">
              $20.0M
            </text>
          </motion.g>
        )}

        {/* Status */}
        <text x={250} y={365} textAnchor="middle"
          className="text-[9px] font-mono"
          fill={phase >= 2 ? "#2dd4bf" : "#64748b"}
          style={{ letterSpacing: "0.2em" }}>
          {phase >= 2 ? "CONFLUENCED // CONTINUOUS_ROLLUP" : "TRIBUTARIES FLOWING..."}
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   §06 — LASER SECURITY GRID
   A request descends through layered laser gates. Each gate validates
   and either passes (green) or blocks (red alarm).
   ═══════════════════════════════════════════════════════════════════ */

const LASER_GATES = [
  { label: "IDENTITY",   detail: "JWT verified",     y: 60  },
  { label: "ROLE",        detail: "role: CFO",        y: 120 },
  { label: "ORG_SCOPE",   detail: "org_id matched",   y: 180 },
  { label: "PERMISSION",  detail: "gl.write granted", y: 240 },
  { label: "RLS",         detail: "row-level pass",   y: 300 },
];

function DiagramLaser() {
  const [cleared, setCleared] = useState(0);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    LASER_GATES.forEach((_, i) => {
      setTimeout(() => setCleared(i + 1), 700 + i * 650);
    });
    const t = setTimeout(() => setGranted(true), 700 + LASER_GATES.length * 650 + 400);
    return () => clearTimeout(t);
  }, []);

  const cx = 250;

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg viewBox="0 0 500 380" className="w-full h-full max-h-[480px]">
        <defs>
          <filter id="laser-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="laser-flare" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <linearGradient id="beam-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(251,191,36,0.8)" />
            <stop offset="100%" stopColor="rgba(251,191,36,0.1)" />
          </linearGradient>
        </defs>

        {/* Vertical corridor walls */}
        <line x1={cx - 100} y1="20" x2={cx - 100} y2="360" stroke="rgba(100,116,139,0.08)" strokeWidth="1" />
        <line x1={cx + 100} y1="20" x2={cx + 100} y2="360" stroke="rgba(100,116,139,0.08)" strokeWidth="1" />

        {/* Laser gates */}
        {LASER_GATES.map((gate, i) => {
          const isPassed = cleared > i;
          const isActive = cleared === i;
          const color = isPassed ? "#34d399" : isActive ? "#fbbf24" : "#f43f5e";

          return (
            <React.Fragment key={i}>
              {/* Laser beam left */}
              <motion.line
                x1={cx - 100} y1={gate.y} x2={cx - 10} y2={gate.y}
                stroke={color}
                strokeWidth={isPassed ? 1 : 2}
                opacity={isPassed ? 0.15 : 0.6}
                filter={!isPassed ? "url(#laser-glow)" : undefined}
                className="transition-all duration-500"
              />
              {/* Laser beam right */}
              <motion.line
                x1={cx + 10} y1={gate.y} x2={cx + 100} y2={gate.y}
                stroke={color}
                strokeWidth={isPassed ? 1 : 2}
                opacity={isPassed ? 0.15 : 0.6}
                filter={!isPassed ? "url(#laser-glow)" : undefined}
                className="transition-all duration-500"
              />
              {/* Gate opening (gap in center when passed) */}
              {!isPassed && (
                <line x1={cx - 10} y1={gate.y} x2={cx + 10} y2={gate.y}
                  stroke={color} strokeWidth="2" opacity="0.6" filter="url(#laser-glow)" />
              )}

              {/* Emitter nodes */}
              <circle cx={cx - 100} cy={gate.y} r="4"
                fill={isPassed ? "rgba(52,211,153,0.15)" : "rgba(244,63,94,0.15)"}
                stroke={color} strokeWidth="1.5"
                className="transition-all duration-500" />
              <circle cx={cx + 100} cy={gate.y} r="4"
                fill={isPassed ? "rgba(52,211,153,0.15)" : "rgba(244,63,94,0.15)"}
                stroke={color} strokeWidth="1.5"
                className="transition-all duration-500" />

              {/* Label left */}
              <text x={cx - 114} y={gate.y + 4} textAnchor="end"
                className="text-[8px] font-mono font-bold"
                fill={color} opacity={isPassed || isActive ? 0.8 : 0.25}
                style={{ letterSpacing: "0.1em" }}>
                {gate.label}
              </text>

              {/* Detail right */}
              <text x={cx + 114} y={gate.y + 4}
                className="text-[7px] font-mono"
                fill={isPassed ? "#34d399" : "#64748b"} opacity={isPassed ? 0.6 : 0.2}>
                {isPassed ? `✓ ${gate.detail}` : gate.detail}
              </text>

              {/* Pass flash */}
              {isPassed && (
                <motion.circle
                  cx={cx} cy={gate.y} r="6" fill={color}
                  filter="url(#laser-flare)"
                  initial={{ r: 6, opacity: 0.8 }}
                  animate={{ r: 25, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Request packet descending */}
        <motion.g
          animate={{ y: cleared * (LASER_GATES[1]?.y! - LASER_GATES[0]?.y!) }}
          transition={{ type: "spring", stiffness: 80, damping: 12 }}
        >
          {/* Packet glow */}
          <circle cx={cx} cy={30} r="12" fill="rgba(251,191,36,0.08)" filter="url(#laser-flare)" />
          {/* Packet body */}
          <motion.rect
            x={cx - 6} y={24} width="12" height="12" rx="3"
            fill="rgba(251,191,36,0.15)"
            stroke="#fbbf24" strokeWidth="1.5"
            animate={granted ? { stroke: "#34d399", fill: "rgba(52,211,153,0.15)" } : {}}
            className="transition-all duration-500"
          />
          {/* Packet inner */}
          <motion.rect
            x={cx - 3} y={27} width="6" height="6" rx="1"
            fill={granted ? "#34d399" : "#fbbf24"} opacity="0.6"
            className="transition-all duration-500"
          />
        </motion.g>

        {/* ACCESS GRANTED */}
        {granted && (
          <motion.g initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ transformOrigin: `${cx}px 350px` }}>
            <rect x={cx - 80} y={340} width="160" height="28" rx="6"
              fill="rgba(52,211,153,0.08)" stroke="#34d399" strokeWidth="1.5" />
            <text x={cx} y={358} textAnchor="middle"
              className="text-[9px] font-mono font-bold" fill="#34d399" style={{ letterSpacing: "0.2em" }}>
              ACCESS GRANTED
            </text>
          </motion.g>
        )}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DIAGRAM REGISTRY
   ═══════════════════════════════════════════════════════════════════ */

const DIAGRAMS = [
  DiagramStrata,
  DiagramVault,
  DiagramGravity,
  DiagramSynaptic,
  DiagramRiver,
  DiagramLaser,
] as const;

// ─── Document metadata ────────────────────────────────────────────────────────

const DOC_HASH      = "0xa3f2b891c4d7e056...f29c3a14";
const DOC_TIMESTAMP = "2026-03-08T09:14:24.000Z";
const DOC_REVISION  = "rev.2026.03.08.001";

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function Features() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [viewed, setViewed] = useState<Set<number>>(new Set([0]));
  const sectionRef = useRef<HTMLElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    setViewed(prev => new Set(prev).add(active));
  }, [active]);

  const navigate = useCallback((idx: number, manual = false) => {
    setDirection(idx > activeRef.current ? 1 : -1);
    setActive(idx);
    if (manual) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setDirection(1);
      setActive(p => (p + 1) % CLAUSES.length);
    }, 7000);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const cur = activeRef.current;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        navigate((cur + 1) % CLAUSES.length, true);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigate((cur - 1 + CLAUSES.length) % CLAUSES.length, true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  useEffect(() => {
    if (!paused) return;
    const t = setTimeout(() => setPaused(false), 14000);
    return () => clearTimeout(t);
  }, [paused, active]);

  const clause = CLAUSES[active]!;
  const accent = ACCENT_STYLES[clause.accent];
  const ActiveDiagram = DIAGRAMS[active]!;

  return (
    <section
      ref={sectionRef}
      className="py-32 border-t border-slate-900 relative z-10 overflow-hidden"
      id="features"
    >
      {/* Ambient accent glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          key={clause.accent}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className={`absolute top-1/2 right-0 w-[600px] h-[600px] -translate-y-1/2 translate-x-1/4 rounded-full blur-[200px] bg-gradient-radial ${accent.glowFrom} ${accent.glowVia} to-transparent`}
        />
      </div>

      <div className="mk-container relative z-10">
        {/* Section header */}
        <div className="mb-12 max-w-3xl">
          <Badge variant="outline" className="mb-6 border-slate-700 text-teal-400 font-mono tracking-widest uppercase">
            Core Architecture
          </Badge>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-4 leading-tight">
            Not just another ERP.<br />
            <span className="text-slate-500">A system of absolute truth.</span>
          </h2>
          <p className="text-slate-400 font-light text-lg">
            We discarded legacy batch processing to build a unified engine that enforces accounting
            truth at every architectural layer — without exception.
          </p>
        </div>

        {/* Specification Document Frame */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-2xl shadow-slate-950/60">
          {/* Chrome header */}
          <div className="flex items-center justify-between px-5 md:px-7 py-4 border-b border-slate-800 bg-slate-950/90">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex gap-1.5">
                <div className="mk-terminal-dot" />
                <div className="mk-terminal-dot" />
                <div className="mk-terminal-dot" />
              </div>
              <span className="font-mono text-xs text-slate-500 tracking-widest uppercase hidden sm:inline">
                SPECIFICATION MANIFEST // {DOC_REVISION}
              </span>
              <span className="font-mono text-xs text-slate-500 tracking-wider uppercase sm:hidden">
                SPEC // {DOC_REVISION}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-600 tracking-wider hidden md:inline">
                {viewed.size}/{CLAUSES.length} VIEWED
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="font-mono text-xs text-teal-500 tracking-widest">LIVE</span>
              </div>
            </div>
          </div>

          {/* Title bar */}
          <div className="px-5 md:px-7 py-4 md:py-5 border-b border-slate-800/60 bg-slate-950/40">
            <div className="font-mono text-xs text-slate-600 tracking-widest mb-1.5 uppercase">
              AFENDA Truth Engine — Architectural Certification
            </div>
            <div className="font-mono text-sm text-slate-500 tracking-wide">
              The following invariants are enforced at the engine level, without exception,
              across every entity, every currency, every jurisdiction.
            </div>
          </div>

          {/* Mobile tab strip */}
          <div className="lg:hidden border-b border-slate-800 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-max">
              {CLAUSES.map((c, i) => {
                const isActive = i === active;
                const a = ACCENT_STYLES[c.accent];
                return (
                  <Button key={c.id} variant="ghost" onClick={() => navigate(i, true)}
                    className={`relative flex items-center gap-2 rounded-none px-4 py-3 transition-all duration-300 shrink-0 ${isActive ? "bg-slate-900/60" : "hover:bg-slate-900/20"}`}>
                    {isActive && (
                      <motion.div layoutId="mobile-tab-bar" className={`absolute bottom-0 left-0 right-0 h-0.5 ${a.bar}`}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                    )}
                    <span className={`${isActive ? a.text : "text-slate-600"} transition-colors`}>{c.icon}</span>
                    <span className={`font-mono text-xs font-bold tracking-widest transition-colors ${isActive ? "text-white" : "text-slate-600"}`}>§{c.id}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] lg:min-h-[560px]">
            {/* Left: Clause list */}
            <div className="hidden lg:flex lg:flex-col border-r border-slate-800">
              {CLAUSES.map((c, i) => {
                const isActive = i === active;
                const a = ACCENT_STYLES[c.accent];
                const isViewed = viewed.has(i) && !isActive;
                return (
                  <Button key={c.id} variant="ghost" onClick={() => navigate(i, true)}
                    className={`flex-1 w-full text-left rounded-none px-5 py-4 border-b border-slate-800/50 last:border-b-0 transition-all duration-300 group relative ${isActive ? "bg-slate-900/50" : "hover:bg-slate-900/20"}`}>
                    {isActive && (
                      <motion.div layoutId="active-clause-bar" className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}`}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                    )}
                    <div className="flex items-start gap-3 h-full overflow-hidden">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 ${isActive ? `${a.iconBg} ${a.iconBorder} ${a.text}` : "bg-slate-900/50 border-slate-800 text-slate-700 group-hover:text-slate-600 group-hover:border-slate-700"}`}>{c.icon}</div>
                      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <span className={`font-mono text-[10px] font-bold tracking-widest shrink-0 transition-colors ${isActive ? a.text : "text-slate-700 group-hover:text-slate-600"}`}>§{c.id}</span>
                          <span className={`font-mono text-[11px] font-bold tracking-wide transition-colors truncate ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-400"}`}>{c.title}</span>
                        </div>
                        <AnimatePresence initial={false}>
                          {isActive && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="text-slate-400 text-[11px] leading-relaxed overflow-hidden mt-1 break-words"
                            >{c.proof}</motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className={`shrink-0 mt-1 w-2 h-2 rounded-full transition-colors duration-300 ${isActive ? a.dot : isViewed ? "bg-slate-700" : "bg-slate-800/60"}`} />
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Right: Cinematic diagram panel */}
            <div className="relative bg-[#060810] min-h-[420px] lg:min-h-[560px]">
              {/* Progress bar */}
              {!paused && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800/60 overflow-hidden z-10">
                  <motion.div key={active} className={`h-full ${accent.bar}`}
                    initial={{ width: "0%" }} animate={{ width: "100%" }}
                    transition={{ duration: 7, ease: "linear" }} />
                </div>
              )}

              {/* Top bar */}
              <div className="absolute top-5 left-6 right-6 lg:left-8 lg:right-8 z-10 flex items-center justify-between">
                <span className={`font-mono text-[9px] tracking-[0.2em] ${accent.text}`}>
                  §{clause.id} // {clause.title}
                </span>
                <div className="flex items-center gap-2">
                  {paused && (
                    <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setPaused(false)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded border border-slate-700/50 bg-slate-900/80 hover:bg-slate-800/80 transition-colors cursor-pointer">
                      <Play className="w-2.5 h-2.5 text-teal-500" />
                      <span className="text-[8px] font-mono text-slate-500 tracking-wider">AUTO</span>
                    </motion.button>
                  )}
                  <div className="flex items-center gap-1">
                    {CLAUSES.map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full transition-all duration-300 ${
                        i === active ? `${accent.dot} w-3` : viewed.has(i) ? "bg-slate-700" : "bg-slate-800/60"
                      }`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Diagram with directional transition */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={active}
                  custom={direction}
                  initial={{ opacity: 0, y: direction * 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: direction * -20 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="absolute inset-0 pt-14 pb-8"
                >
                  <ActiveDiagram />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Cryptographic footer */}
          <div className="px-5 md:px-7 py-3.5 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] md:text-[9px] text-slate-700 tracking-widest">HASH</span>
              <span className="font-mono text-[9px] md:text-[10px] text-teal-400">{DOC_HASH}</span>
            </div>
            <div className="hidden lg:block h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] md:text-[9px] text-slate-700 tracking-widest">SIGNED</span>
              <span className="font-mono text-[9px] md:text-[10px] text-slate-400">BIG4_AUDITOR_ENGINE</span>
            </div>
            <div className="hidden lg:block h-3 w-px bg-slate-800" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-mono text-[8px] md:text-[9px] text-slate-700 tracking-widest">TIMESTAMP</span>
              <span className="font-mono text-[9px] md:text-[10px] text-slate-400">{DOC_TIMESTAMP}</span>
            </div>
            <div className="lg:ml-auto flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[9px] md:text-[10px] text-emerald-400 tracking-widest">VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
