"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "./_landing-ui";
import {
  Lock,
  ArrowRightLeft,
  Building2,
  ShieldCheck,
  Fingerprint,
  Layers3,
  Hash,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Ledger Architecture — "Immutable by design. Auditable by default."
   Full-width 3D isometric visualization of AFENDA's append-only,
   double-entry ledger architecture with cross-domain settlement
   parity and multi-entity isolation.
   ────────────────────────────────────────────────────────────────────── */

const BLOCK_COUNT = 7;
const ENTITY_NODES = [
  { id: "EMEA", label: "EMEA_ENTITY", color: "teal" },
  { id: "APAC", label: "APAC_ENTITY", color: "cyan" },
  { id: "AMER", label: "AMER_ENTITY", color: "indigo" },
];

const DOMAIN_STREAMS = [
  { id: "AP", label: "Accounts Payable", shortLabel: "AP", angle: -35, color: "emerald" },
  { id: "AR", label: "Accounts Receivable", shortLabel: "AR", angle: 0, color: "cyan" },
  { id: "GL", label: "General Ledger", shortLabel: "GL", angle: 35, color: "violet" },
];

function LedgerBlock({
  index,
  total,
  isLatest,
}: {
  index: number;
  total: number;
  isLatest: boolean;
}) {
  const zOffset = index * 36;
  const opacity = 0.35 + (index / total) * 0.65;

  return (
    <motion.div
      initial={{ opacity: 0, z: zOffset - 40 }}
      animate={{ opacity, z: zOffset }}
      transition={{
        duration: 0.8,
        delay: index * 0.12,
        ease: "easeOut",
      }}
      className="absolute w-full h-full"
      style={{
        transform: `translateZ(${zOffset}px)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Block face */}
      <div
        className={`absolute inset-0 rounded-lg border backdrop-blur-sm transition-all duration-700 ${
          isLatest
            ? "border-teal-400/60 bg-teal-500/10 shadow-[0_0_30px_rgba(20,184,166,0.15)]"
            : "border-slate-700/50 bg-slate-900/60"
        }`}
      >
        {/* Block grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:12px_8px] rounded-lg" />

        {/* Block content */}
        <div className="absolute inset-0 flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isLatest ? "bg-teal-400 animate-pulse" : "bg-slate-600"
              }`}
            />
            <span
              className={`text-[7px] font-mono tracking-wider ${
                isLatest ? "text-teal-300" : "text-slate-600"
              }`}
            >
              BLK_{String(total - index).padStart(4, "0")}
            </span>
          </div>
          <span
            className={`text-[6px] font-mono ${
              isLatest ? "text-teal-500" : "text-slate-700"
            }`}
          >
            {isLatest ? "APPEND" : "SEALED"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function DataParticle({
  delay,
  fromX,
  fromY,
  color,
}: {
  delay: number;
  fromX: string;
  fromY: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]",
    cyan: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]",
    violet: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]",
    teal: "bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.9)]",
  };

  return (
    <motion.div
      initial={{ left: fromX, top: fromY, opacity: 0, scale: 0.5 }}
      animate={{
        left: "50%",
        top: "50%",
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1, 0.3],
      }}
      transition={{
        duration: 2.8,
        delay,
        repeat: Infinity,
        repeatDelay: 1.5,
        ease: "easeInOut",
      }}
      className={`absolute w-2 h-2 rounded-full -ml-1 -mt-1 ${(colorMap[color] || colorMap.teal)!}`}
    />
  );
}

function EntityNode({
  entity,
  index,
}: {
  entity: (typeof ENTITY_NODES)[0];
  index: number;
}) {
  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    teal: {
      border: "border-teal-500/40",
      bg: "bg-teal-950/30",
      text: "text-teal-400",
      glow: "shadow-[0_0_20px_rgba(20,184,166,0.15)]",
    },
    cyan: {
      border: "border-cyan-500/40",
      bg: "bg-cyan-950/30",
      text: "text-cyan-400",
      glow: "shadow-[0_0_20px_rgba(34,211,238,0.15)]",
    },
    indigo: {
      border: "border-indigo-500/40",
      bg: "bg-indigo-950/30",
      text: "text-indigo-400",
      glow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    },
  };

  const colors = (colorMap[entity.color] || colorMap.teal)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.8 + index * 0.15 }}
      className="flex flex-col items-center gap-2"
    >
      <div
        className={`relative w-20 h-20 rounded-xl border-2 ${colors.border} ${colors.bg} ${colors.glow} flex items-center justify-center backdrop-blur-sm`}
      >
        {/* Isolation boundary ring */}
        <div className={`absolute -inset-1.5 rounded-xl border border-dashed ${colors.border} opacity-50`} />

        <Building2 className={`w-6 h-6 ${colors.text}`} />

        {/* Lock indicator */}
        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 border ${colors.border} flex items-center justify-center`}>
          <Lock className={`w-2.5 h-2.5 ${colors.text}`} />
        </div>
      </div>

      <span className={`text-[9px] font-mono ${colors.text} tracking-[0.2em]`}>
        {entity.label}
      </span>
      <span className="text-[7px] font-mono text-slate-600 tracking-wider">
        ISOLATED
      </span>
    </motion.div>
  );
}

export function LedgerArchitecture() {
  const [latestBlock, setLatestBlock] = useState(BLOCK_COUNT - 1);
  const [txCount, setTxCount] = useState(48291);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatestBlock((prev) => (prev === BLOCK_COUNT - 1 ? 0 : prev + 1));
      setTxCount((prev) => prev + Math.floor(Math.random() * 7) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="py-32 mk-section-deep border-t border-slate-900 relative z-10 overflow-hidden"
      id="architecture"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-teal-900/8 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-900/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-900/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="mk-container relative z-10">
        {/* Section Header */}
        <div className="mb-20 max-w-4xl">
          <Badge
            variant="outline"
            className="mb-6 border-teal-900/50 text-teal-400 font-mono tracking-[0.2em] uppercase text-[10px] bg-teal-950/20 px-3 py-1"
          >
            <Fingerprint className="w-3 h-3 mr-2" />
            Ledger Architecture
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight mb-6 leading-[1.1]">
            Immutable by design.{" "}
            <span className="text-slate-500">Auditable by default.</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 font-light leading-relaxed max-w-3xl">
            Underneath the UI, AFENDA operates on an append-only, double-entry
            ledger model. When an economic event occurs — whether a high-volume
            vendor payout or a micro-adjustment — it is timestamped, linked to
            approvals, and preserved as part of the{" "}
            <span className="text-teal-400/80">permanent financial narrative</span>.
          </p>
        </div>

        {/* Main Architecture Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 items-center">
          {/* Left: 3D Isometric Ledger Stack */}
          <div className="lg:col-span-7 relative flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative w-full max-w-[640px] h-[580px] flex items-center justify-center"
            >
              {/* ─── CENTRAL LEDGER SPINE ─── */}
              <div
                className="absolute w-[160px] h-[40px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  perspective: "1200px",
                  perspectiveOrigin: "50% 35%",
                }}
              >
                <div
                  className="relative w-full h-full"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: "rotateX(55deg) rotateZ(-30deg)",
                  }}
                >
                  {Array.from({ length: BLOCK_COUNT }).map((_, i) => (
                    <LedgerBlock
                      key={i}
                      index={i}
                      total={BLOCK_COUNT}
                      isLatest={i === latestBlock}
                    />
                  ))}
                </div>
              </div>

              {/* ─── DOMAIN CONVERGENCE STREAMS ─── */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 640 580"
                fill="none"
              >
                <defs>
                  <linearGradient id="grad-ap" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="rgba(52,211,153,0.6)" />
                    <stop offset="100%" stopColor="rgba(52,211,153,0)" />
                  </linearGradient>
                  <linearGradient id="grad-ar" x1="100%" y1="50%" x2="0%" y2="50%">
                    <stop offset="0%" stopColor="rgba(34,211,238,0.6)" />
                    <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                  </linearGradient>
                  <linearGradient id="grad-gl" x1="50%" y1="100%" x2="50%" y2="0%">
                    <stop offset="0%" stopColor="rgba(167,139,250,0.5)" />
                    <stop offset="100%" stopColor="rgba(167,139,250,0)" />
                  </linearGradient>

                  {/* Animated dash pattern */}
                  <filter id="glow-green">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-cyan">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-violet">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* AP Stream — left to center */}
                <motion.path
                  d="M 60 200 C 160 200, 240 280, 320 290"
                  stroke="rgba(52,211,153,0.25)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, delay: 0.5 }}
                />
                <motion.path
                  d="M 60 200 C 160 200, 240 280, 320 290"
                  stroke="rgba(52,211,153,0.6)"
                  strokeWidth="1.5"
                  strokeDasharray="3 12"
                  filter="url(#glow-green)"
                  animate={{ strokeDashoffset: [0, -30] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                {/* AR Stream — right to center */}
                <motion.path
                  d="M 580 200 C 480 200, 400 280, 320 290"
                  stroke="rgba(34,211,238,0.25)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, delay: 0.8 }}
                />
                <motion.path
                  d="M 580 200 C 480 200, 400 280, 320 290"
                  stroke="rgba(34,211,238,0.6)"
                  strokeWidth="1.5"
                  strokeDasharray="3 12"
                  filter="url(#glow-cyan)"
                  animate={{ strokeDashoffset: [0, -30] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />

                {/* GL Stream — bottom to center */}
                <motion.path
                  d="M 320 520 C 320 440, 320 360, 320 290"
                  stroke="rgba(167,139,250,0.25)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, delay: 1.1 }}
                />
                <motion.path
                  d="M 320 520 C 320 440, 320 360, 320 290"
                  stroke="rgba(167,139,250,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="3 12"
                  filter="url(#glow-violet)"
                  animate={{ strokeDashoffset: [0, -30] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                />

                {/* Entity isolation arcs — bottom horizontal */}
                <path
                  d="M 120 480 L 520 480"
                  stroke="rgba(148,163,184,0.08)"
                  strokeWidth="1"
                />

                {/* Entity → GL feed lines */}
                <path
                  d="M 160 460 L 260 520"
                  stroke="rgba(20,184,166,0.15)"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />
                <path
                  d="M 320 450 L 320 520"
                  stroke="rgba(34,211,238,0.15)"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />
                <path
                  d="M 480 460 L 380 520"
                  stroke="rgba(99,102,241,0.15)"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />

                {/* Settlement parity line — horizontal across center */}
                <motion.line
                  x1="120"
                  y1="290"
                  x2="520"
                  y2="290"
                  stroke="rgba(45,212,191,0.12)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 3, delay: 1.5 }}
                />

                {/* Unified truth rollup — top */}
                <motion.path
                  d="M 320 290 L 320 80"
                  stroke="rgba(45,212,191,0.3)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 2 }}
                />
              </svg>

              {/* ─── DATA PARTICLES ─── */}
              <DataParticle delay={0} fromX="10%" fromY="34%" color="emerald" />
              <DataParticle delay={1.2} fromX="10%" fromY="38%" color="emerald" />
              <DataParticle delay={0.6} fromX="90%" fromY="34%" color="cyan" />
              <DataParticle delay={1.8} fromX="90%" fromY="38%" color="cyan" />
              <DataParticle delay={0.3} fromX="50%" fromY="90%" color="violet" />
              <DataParticle delay={1.5} fromX="50%" fromY="92%" color="violet" />

              {/* ─── DOMAIN SOURCE LABELS ─── */}
              {/* AP — left */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="absolute left-0 top-[30%] flex items-center gap-2"
              >
                <div className="flex flex-col items-end bg-slate-950/90 border border-emerald-500/30 rounded-lg px-3 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(52,211,153,0.08)]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-mono text-emerald-400 tracking-[0.15em]">
                      AP_STREAM
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-500">
                    VENDOR PAYOUTS
                  </span>
                </div>
              </motion.div>

              {/* AR — right */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="absolute right-0 top-[30%] flex items-center gap-2"
              >
                <div className="flex flex-col items-start bg-slate-950/90 border border-cyan-500/30 rounded-lg px-3 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] font-mono text-cyan-400 tracking-[0.15em]">
                      AR_STREAM
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-500">
                    RECEIVABLES
                  </span>
                </div>
              </motion.div>

              {/* GL — bottom center */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="absolute bottom-[3%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
              >
                <div className="flex flex-col items-center bg-slate-950/90 border border-violet-500/30 rounded-lg px-3 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(167,139,250,0.08)]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers3 className="w-3 h-3 text-violet-400" />
                    <span className="text-[10px] font-mono text-violet-400 tracking-[0.15em]">
                      GL_STREAM
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-500">
                    GENERAL LEDGER
                  </span>
                </div>
              </motion.div>

              {/* ─── UNIFIED GLOBAL TRUTH — TOP ─── */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 1.8 }}
                className="absolute top-[2%] left-1/2 -translate-x-1/2 flex flex-col items-center"
              >
                <div className="relative flex flex-col items-center bg-slate-950/95 border border-teal-400/50 rounded-xl px-5 py-3 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.12)]">
                  <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-teal-400/10 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-2 mb-1 relative">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span className="text-[11px] font-mono text-teal-300 tracking-[0.25em]">
                      UNIFIED_GLOBAL_TRUTH
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-teal-500/70 tracking-wider relative">
                    CONSOLIDATED // IMMUTABLE
                  </span>
                </div>
                <div className="w-px h-5 bg-gradient-to-b from-teal-400/50 to-transparent" />
              </motion.div>

              {/* ─── ENTITY NODES — BOTTOM ROW ─── */}
              <div className="absolute bottom-[16%] w-full flex justify-center gap-12 md:gap-20">
                {ENTITY_NODES.map((entity, i) => (
                  <EntityNode key={entity.id} entity={entity} index={i} />
                ))}
              </div>

              {/* ─── CENTRAL CORE ANNOTATION ─── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
              >
                {/* Pulsing rings */}
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: ring * 0.8,
                      ease: "easeOut",
                    }}
                    className="absolute w-16 h-16 rounded-full border border-teal-500/20"
                  />
                ))}

                {/* Core diamond */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rotate-45 rounded-lg border-2 border-teal-400/40 bg-teal-500/10 backdrop-blur-xl shadow-[0_0_50px_rgba(20,184,166,0.2)]" />
                  <Hash className="w-6 h-6 text-teal-400 relative z-10" />
                </div>

                {/* Live transaction counter */}
                <div className="mt-3 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-500 tracking-[0.2em]">
                    APPEND_ONLY_LEDGER
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-teal-400 tabular-nums">
                      {txCount.toLocaleString()} TX
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* ─── SETTLEMENT PARITY ANNOTATION ─── */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 2.2 }}
                className="absolute top-[47%] right-[6%] pointer-events-none hidden md:block"
              >
                <div className="flex items-center gap-2">
                  <div className="h-px w-10 bg-slate-700" />
                  <div className="bg-slate-950/80 border border-slate-800 rounded px-2 py-1 backdrop-blur-sm">
                    <span className="text-[8px] font-mono text-slate-500 tracking-wider">
                      SETTLEMENT_PARITY_LINE
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Right: Architecture Properties */}
          <div className="lg:col-span-5 space-y-6 lg:pl-8">
            {/* Property 1: Cross-Domain Settlement Parity */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="group"
            >
              <div className="p-6 rounded-xl border border-slate-800/60 bg-slate-900/30 hover:bg-slate-900/50 hover:border-teal-500/20 transition-all duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-teal-950/50 border border-teal-500/30 flex items-center justify-center shrink-0 group-hover:border-teal-400/50 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.1)] transition-all duration-500">
                    <ArrowRightLeft className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">
                      Cross-Domain Settlement Parity
                    </h3>
                  </div>
                </div>
                <p className="text-slate-400 font-light leading-relaxed text-sm md:text-base">
                  AP, AR, and General Ledger resolve into{" "}
                  <span className="text-teal-400/80">
                    one continuous sequence
                  </span>
                  , eliminating month-end reconciliation drift. Every economic
                  event settles in real time across all domains simultaneously.
                </p>

                {/* Mini visualization — three streams merging */}
                <div className="mt-5 flex items-center gap-3">
                  {["AP", "AR", "GL"].map((domain, i) => (
                    <React.Fragment key={domain}>
                      <div
                        className={`px-2.5 py-1 rounded border text-[10px] font-mono tracking-wider ${
                          i === 0
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20"
                            : i === 1
                            ? "border-cyan-500/30 text-cyan-400 bg-cyan-950/20"
                            : "border-violet-500/30 text-violet-400 bg-violet-950/20"
                        }`}
                      >
                        {domain}
                      </div>
                      {i < 2 && (
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                          className="w-4 h-px bg-slate-600"
                        />
                      )}
                    </React.Fragment>
                  ))}
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                    className="w-4 h-px bg-teal-500/50"
                  />
                  <div className="px-2 py-1 rounded border border-teal-500/40 text-[10px] font-mono text-teal-400 bg-teal-950/30 tracking-wider">
                    UNIFIED
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Property 2: Multi-Entity Isolation */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="group"
            >
              <div className="p-6 rounded-xl border border-slate-800/60 bg-slate-900/30 hover:bg-slate-900/50 hover:border-cyan-500/20 transition-all duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all duration-500">
                    <Building2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">
                      Multi-Entity Isolation
                    </h3>
                  </div>
                </div>
                <p className="text-slate-400 font-light leading-relaxed text-sm md:text-base">
                  Entity boundaries remain{" "}
                  <span className="text-cyan-400/80">
                    cryptographically strict
                  </span>{" "}
                  while still rolling up to a unified global truth. No data
                  leakage, no boundary violations — ever.
                </p>

                {/* Entity isolation badges */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {ENTITY_NODES.map((entity) => (
                    <div
                      key={entity.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono tracking-wider ${
                        entity.color === "teal"
                          ? "border-teal-500/30 text-teal-400 bg-teal-950/20"
                          : entity.color === "cyan"
                          ? "border-cyan-500/30 text-cyan-400 bg-cyan-950/20"
                          : "border-indigo-500/30 text-indigo-400 bg-indigo-950/20"
                      }`}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      {entity.id}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Property 3: Append-Only Immutability */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="group"
            >
              <div className="p-6 rounded-xl border border-slate-800/60 bg-slate-900/30 hover:bg-slate-900/50 hover:border-indigo-500/20 transition-all duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:border-indigo-400/50 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-500">
                    <Fingerprint className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">
                      Append-Only Immutability
                    </h3>
                  </div>
                </div>
                <p className="text-slate-400 font-light leading-relaxed text-sm md:text-base">
                  Every transaction is{" "}
                  <span className="text-indigo-400/80">
                    timestamped, hash-linked, and sealed
                  </span>
                  . No record can be deleted or silently modified. The complete
                  financial narrative is preserved for auditors, regulators, and
                  forensic review.
                </p>

                {/* Block chain mini-viz */}
                <div className="mt-5 flex items-center gap-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <React.Fragment key={i}>
                      <motion.div
                        animate={
                          i === 5
                            ? { borderColor: ["rgba(99,102,241,0.3)", "rgba(99,102,241,0.7)", "rgba(99,102,241,0.3)"] }
                            : {}
                        }
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-8 h-6 rounded border flex items-center justify-center ${
                          i === 5
                            ? "border-indigo-500/50 bg-indigo-950/30"
                            : "border-slate-700/50 bg-slate-800/30"
                        }`}
                      >
                        <span
                          className={`text-[7px] font-mono ${
                            i === 5 ? "text-indigo-400" : "text-slate-600"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </motion.div>
                      {i < 5 && (
                        <div className="w-2 h-px bg-slate-700/50" />
                      )}
                    </React.Fragment>
                  ))}
                  <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="ml-1 w-1.5 h-4 bg-indigo-500/50 rounded-sm"
                  />
                </div>
              </div>
            </motion.div>

            {/* Live status bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 1 }}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-800/40 bg-slate-950/50"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                  LEDGER_INTEGRITY
                </span>
              </div>
              <span className="text-[10px] font-mono text-teal-400 tracking-wider">
                VERIFIED // CONTINUOUS
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
