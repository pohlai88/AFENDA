/* shadcn-exempt: Marketing-only ecosystem showcase — intentional dark terminal palette */
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "motion/react";
import { Badge } from "./_landing-ui";
import {
  BookOpen,
  FileText,
  Coins,
  Shield,
  Building2,
  Workflow,
  Scale,
  Fingerprint,
  Zap,
  ArrowRight,
  ArrowRightLeft,
  Activity,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════════
   THE ECOSYSTEM NEXUS
   "They store transactions. We verify truth."

   This section is the market-readiness proof — a living, breathing
   visualization of AFENDA's full ecosystem showing how it sits as the
   "truth layer" between your existing ERPs and the regulators/auditors
   who demand verifiable financial data.

   Visual metaphor: A satellite view of a financial city at night — AFENDA
   is the luminous core, modules are districts, and integration bridges
   are data highways pulsing with traffic to every major ERP platform.

   The auto-cycling highlight demonstrates real-time data flow:
   Integration → AFENDA Module → Truth Core → Verified Output

   Key message: We don't replace. We complete.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Data: AFENDA modules (inner ring) ───────────────────────────────────── */

interface ModuleNode {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  pillar: "kernel" | "erp" | "comm";
  color: string;
}

const MODULES: ModuleNode[] = [
  { id: "gl",          name: "General Ledger",      shortName: "GL",     icon: BookOpen,    pillar: "erp",    color: "#10b981" },
  { id: "ap",          name: "Accounts Payable",    shortName: "AP",     icon: FileText,    pillar: "erp",    color: "#10b981" },
  { id: "ar",          name: "Accounts Receivable", shortName: "AR",     icon: Coins,       pillar: "erp",    color: "#14b8a6" },
  { id: "audit",       name: "Audit Engine",        shortName: "AUDIT",  icon: Shield,      pillar: "kernel", color: "#06b6d4" },
  { id: "treasury",    name: "Treasury",            shortName: "TRSY",   icon: Building2,   pillar: "erp",    color: "#10b981" },
  { id: "procurement", name: "Procurement",         shortName: "PROC",   icon: Workflow,    pillar: "erp",    color: "#10b981" },
  { id: "compliance",  name: "Compliance",          shortName: "CMPL",   icon: Scale,       pillar: "kernel", color: "#06b6d4" },
  { id: "identity",    name: "Identity & RBAC",     shortName: "IAM",    icon: Fingerprint, pillar: "kernel", color: "#06b6d4" },
];

/* ── Data: Integration partners (outer ring) ─────────────────────────────── */

interface IntegrationPartner {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  syncType: string;
  afendaAdds: string;
  connectedModules: string[];
}

const INTEGRATIONS: IntegrationPartner[] = [
  {
    id: "sap",
    name: "SAP",
    color: "#0077cc",
    glowColor: "rgba(0,119,204,0.2)",
    syncType: "Bi-directional GL / AP / AR",
    afendaAdds: "Cryptographic audit trail on every SAP journal line. Real-time anomaly detection.",
    connectedModules: ["gl", "ap", "ar"],
  },
  {
    id: "oracle",
    name: "Oracle",
    color: "#f80000",
    glowColor: "rgba(248,0,0,0.15)",
    syncType: "Financial Cloud + Treasury sync",
    afendaAdds: "Append-only verification layer for Oracle Financials. Cross-entity consolidation.",
    connectedModules: ["gl", "treasury"],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    color: "#2ca01c",
    glowColor: "rgba(44,160,28,0.2)",
    syncType: "AP / AR / Bank sync",
    afendaAdds: "Enterprise-grade compliance wrapper around QuickBooks data. XBRL export.",
    connectedModules: ["ap", "ar"],
  },
  {
    id: "xero",
    name: "Xero",
    color: "#13b5ea",
    glowColor: "rgba(19,181,234,0.2)",
    syncType: "Full ledger + reconciliation",
    afendaAdds: "Multi-entity consolidation across Xero orgs. SOX-ready audit trail.",
    connectedModules: ["ap", "ar", "gl"],
  },
  {
    id: "odoo",
    name: "Odoo",
    color: "#875a7b",
    glowColor: "rgba(135,90,123,0.2)",
    syncType: "Procurement + AP pipeline",
    afendaAdds: "Idempotent command verification on Odoo workflows. PO-to-payment traceability.",
    connectedModules: ["procurement", "ap"],
  },
  {
    id: "zoho",
    name: "Zoho",
    color: "#e42527",
    glowColor: "rgba(228,37,39,0.15)",
    syncType: "Invoice + expense sync",
    afendaAdds: "Automated duplicate detection + IFRS dual-reporting on Zoho Books data.",
    connectedModules: ["ap", "ar"],
  },
  {
    id: "netsuite",
    name: "NetSuite",
    color: "#7f8c8d",
    glowColor: "rgba(127,140,141,0.2)",
    syncType: "GL + multi-subsidiary consolidation",
    afendaAdds: "Regulatory compliance engine atop NetSuite. 180+ jurisdiction tax validation.",
    connectedModules: ["gl", "treasury", "compliance"],
  },
  {
    id: "erpnext",
    name: "ERPNext",
    color: "#0089ff",
    glowColor: "rgba(0,137,255,0.2)",
    syncType: "Full ERP module bridge",
    afendaAdds: "Event-sourced audit layer for ERPNext. Outbox-driven async processing.",
    connectedModules: ["procurement", "ap", "ar"],
  },
];

/* ── Data: Sync terminal feed ────────────────────────────────────────────── */

interface SyncEvent {
  time: string;
  direction: "←" | "→" | "⇄";
  source: string;
  event: string;
  ref: string;
  latency: string;
  status: "ok" | "warn";
}

const SYNC_EVENTS: SyncEvent[] = [
  { time: "14:23:01", direction: "←", source: "SAP.GL",      event: "3,847 journal entries synced",   ref: "JE-2026-4891…97",  latency: "0.34s", status: "ok" },
  { time: "14:23:02", direction: "→", source: "XERO.AP",     event: "Invoice batch pushed",           ref: "INV-2026-1247",    latency: "0.12s", status: "ok" },
  { time: "14:23:04", direction: "←", source: "ORACLE.FX",   event: "FX rates ingested (214 pairs)",  ref: "FX-20260309-1423", latency: "0.21s", status: "ok" },
  { time: "14:23:05", direction: "⇄", source: "NETSUITE.GL", event: "Multi-sub consolidation run",    ref: "CONS-2026-Q1-03",  latency: "1.82s", status: "ok" },
  { time: "14:23:07", direction: "←", source: "ODOO.PROC",   event: "PO approval pipeline sync",      ref: "PO-2026-0891",     latency: "0.09s", status: "ok" },
  { time: "14:23:08", direction: "→", source: "QUICKBOOKS",  event: "Bank reconciliation exported",   ref: "RECON-2026-W10",   latency: "0.28s", status: "ok" },
  { time: "14:23:10", direction: "←", source: "ERPNEXT.AP",  event: "Vendor invoice ingested",        ref: "VINV-2026-3341",   latency: "0.07s", status: "ok" },
  { time: "14:23:12", direction: "⇄", source: "ZOHO.BOOKS",  event: "AR aging snapshot synced",        ref: "AGING-2026-Q1",    latency: "0.44s", status: "warn" },
  { time: "14:23:14", direction: "→", source: "WEBHOOK",     event: "GL close event emitted",          ref: "EVT-GL-Q1-CLOSE",  latency: "0.01s", status: "ok" },
  { time: "14:23:15", direction: "←", source: "SAP.AP",      event: "Payment run verified",            ref: "PAY-2026-0412",    latency: "0.55s", status: "ok" },
];

/* ── Data: Throughput stats ──────────────────────────────────────────────── */

const THROUGHPUT_STATS = [
  { label: "Events / sec",      value: "14,200",  accent: "#14b8a6" },
  { label: "Active bridges",    value: "847",     accent: "#10b981" },
  { label: "Data points / mo",  value: "2.4B",    accent: "#06b6d4" },
  { label: "Uptime (365d)",     value: "99.997%", accent: "#34d399" },
];

/* ── SVG constants ───────────────────────────────────────────────────────── */

const SVG_W = 800;
const SVG_H = 500;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const RING1_R = 120;
const RING2_R = 215;
const CYCLE_MS = 3200;

/* ── Helper: compute positions ───────────────────────────────────────────── */

function ringPosition(index: number, total: number, radius: number, offsetDeg = 0) {
  const angle = ((index / total) * 360 + offsetDeg - 90) * (Math.PI / 180);
  return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius };
}

/* ── Sub-component: Constellation SVG ────────────────────────────────────── */

function ConstellationSVG({
  activeIndex,
  onSelectIntegration,
  prefersReduced,
}: {
  activeIndex: number;
  onSelectIntegration: (i: number) => void;
  prefersReduced: boolean | null;
}) {
  const modulePositions = useMemo(
    () => MODULES.map((_, i) => ringPosition(i, MODULES.length, RING1_R)),
    [],
  );
  const integrationPositions = useMemo(
    () => INTEGRATIONS.map((_, i) => ringPosition(i, INTEGRATIONS.length, RING2_R, 22.5)),
    [],
  );

  const activeIntegration = INTEGRATIONS[activeIndex];
  const activeModuleIds = activeIntegration?.connectedModules ?? [];

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-auto"
      role="img"
      aria-label="AFENDA ecosystem constellation showing module and integration connections"
    >
      <defs>
        {/* Radial glow for center */}
        <radialGradient id="nexus-core-glow">
          <stop offset="0%" stopColor="rgba(20,184,166,0.25)" />
          <stop offset="100%" stopColor="rgba(20,184,166,0)" />
        </radialGradient>
        {/* Pulse ring gradient */}
        <radialGradient id="nexus-pulse">
          <stop offset="0%" stopColor="rgba(20,184,166,0.08)" />
          <stop offset="60%" stopColor="rgba(20,184,166,0.03)" />
          <stop offset="100%" stopColor="rgba(20,184,166,0)" />
        </radialGradient>
      </defs>

      {/* ── Background grid pattern ── */}
      <g opacity={0.15}>
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`gv-${i}`} x1={i * 56} y1={0} x2={i * 56} y2={SVG_H} stroke="#1e293b" strokeWidth={0.5} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`gh-${i}`} x1={0} y1={i * 56} x2={SVG_W} y2={i * 56} stroke="#1e293b" strokeWidth={0.5} />
        ))}
      </g>

      {/* ── Orbital rings (decorative) ── */}
      <circle cx={CX} cy={CY} r={RING1_R} fill="none" stroke="#1e293b" strokeWidth={0.5} strokeDasharray="4 8" opacity={0.5} />
      <circle cx={CX} cy={CY} r={RING2_R} fill="none" stroke="#1e293b" strokeWidth={0.5} strokeDasharray="4 12" opacity={0.3} />

      {/* ── Pulse waves from center ── */}
      {!prefersReduced && [0, 1, 2].map((ring) => (
        <motion.circle
          key={`pulse-${ring}`}
          cx={CX}
          cy={CY}
          fill="none"
          stroke="rgba(20,184,166,0.12)"
          strokeWidth={0.8}
          initial={{ r: 30, opacity: 0.3 }}
          animate={{ r: 260, opacity: 0 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: ring * 1.3,
            ease: "easeOut",
          }}
        />
      ))}

      {/* ── Connection lines: center → modules ── */}
      {modulePositions.map((pos, i) => {
        const module = MODULES[i];
        if (!module) return null;
        const isActive = activeModuleIds.includes(module.id);
        return (
          <line
            key={`cm-${i}`}
            x1={CX}
            y1={CY}
            x2={pos.x}
            y2={pos.y}
            stroke={isActive ? "rgba(20,184,166,0.35)" : "rgba(30,41,59,0.3)"}
            strokeWidth={isActive ? 1.5 : 0.5}
            style={{ transition: "all 0.6s ease" }}
          />
        );
      })}

      {/* ── Connection lines: modules → integrations ── */}
      {INTEGRATIONS.map((intg, intgIdx) => {
        const intgPos = integrationPositions[intgIdx];
        const isActiveIntg = intgIdx === activeIndex;
        return intg.connectedModules.map((modId) => {
          const modIdx = MODULES.findIndex((m) => m.id === modId);
          if (modIdx === -1) return null;
          const modPos = modulePositions[modIdx];
          if (!modPos || !intgPos) return null;
          return (
            <g key={`conn-${intg.id}-${modId}`}>
              <line
                x1={modPos.x}
                y1={modPos.y}
                x2={intgPos.x}
                y2={intgPos.y}
                stroke={isActiveIntg ? intg.color : "rgba(30,41,59,0.2)"}
                strokeWidth={isActiveIntg ? 1.5 : 0.4}
                strokeDasharray={isActiveIntg ? "none" : "2 6"}
                opacity={isActiveIntg ? 0.7 : 0.4}
                style={{ transition: "all 0.6s ease" }}
              />
              {/* Data particle along active connection */}
              {isActiveIntg && !prefersReduced && (
                <motion.circle
                  r={2.5}
                  fill={intg.color}
                  initial={{ cx: intgPos.x, cy: intgPos.y, opacity: 0 }}
                  animate={{
                    cx: [intgPos.x, modPos.x, CX],
                    cy: [intgPos.y, modPos.y, CY],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 0.8,
                  }}
                >
                  <animate
                    attributeName="r"
                    values="2.5;3.5;2.5"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </motion.circle>
              )}
            </g>
          );
        });
      })}

      {/* ── Central core: AFENDA ── */}
      <circle cx={CX} cy={CY} r={60} fill="url(#nexus-core-glow)" />
      <circle
        cx={CX}
        cy={CY}
        r={32}
        fill="#0B0D12"
        stroke="rgba(20,184,166,0.5)"
        strokeWidth={1.5}
      />
      <circle
        cx={CX}
        cy={CY}
        r={26}
        fill="rgba(20,184,166,0.08)"
        stroke="rgba(20,184,166,0.2)"
        strokeWidth={0.5}
      />
      <text
        x={CX}
        y={CY - 4}
        textAnchor="middle"
        fill="#5eead4"
        fontSize={9}
        fontWeight={700}
        letterSpacing="0.2em"
      >
        AFENDA
      </text>
      <text
        x={CX}
        y={CY + 10}
        textAnchor="middle"
        fill="#64748b"
        fontSize={6}
        letterSpacing="0.15em"
      >
        TRUTH CORE
      </text>

      {/* ── Module nodes (inner ring) ── */}
      {MODULES.map((mod, i) => {
        const pos = modulePositions[i];
        if (!pos) return null;
        const isActive = activeModuleIds.includes(mod.id);
        return (
          <g key={mod.id}>
            {/* Glow */}
            {isActive && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={24}
                fill={`${mod.color}10`}
                stroke="none"
                style={{ transition: "all 0.6s ease" }}
              />
            )}
            {/* Node */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={18}
              fill="#0B0D12"
              stroke={isActive ? mod.color : "#1e293b"}
              strokeWidth={isActive ? 1.5 : 0.8}
              style={{ transition: "all 0.4s ease" }}
            />
            {/* Label */}
            <text
              x={pos.x}
              y={pos.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? mod.color : "#64748b"}
              fontSize={7}
              fontWeight={700}
              letterSpacing="0.12em"
              style={{ transition: "fill 0.4s ease" }}
            >
              {mod.shortName}
            </text>
            {/* Full name below node */}
            <text
              x={pos.x}
              y={pos.y + 28}
              textAnchor="middle"
              fill={isActive ? "#94a3b8" : "#334155"}
              fontSize={5.5}
              letterSpacing="0.05em"
              style={{ transition: "fill 0.4s ease" }}
            >
              {mod.name}
            </text>
          </g>
        );
      })}

      {/* ── Integration nodes (outer ring) ── */}
      {INTEGRATIONS.map((intg, i) => {
        const pos = integrationPositions[i];
        if (!pos) return null;
        const isActive = i === activeIndex;
        return (
          <g
            key={intg.id}
            className="cursor-pointer"
            onClick={() => onSelectIntegration(i)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${intg.name} integration`}
          >
            {/* Outer glow ring */}
            {isActive && !prefersReduced && (
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                fill="none"
                stroke={intg.color}
                strokeWidth={0.5}
                initial={{ r: 16, opacity: 0.5 }}
                animate={{ r: 28, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            {/* Node background */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={16}
              fill={isActive ? `${intg.color}15` : "#0B0D12"}
              stroke={isActive ? intg.color : "#1e293b"}
              strokeWidth={isActive ? 1.5 : 0.6}
              style={{ transition: "all 0.4s ease" }}
            />
            {/* Label */}
            <text
              x={pos.x}
              y={pos.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? intg.color : "#475569"}
              fontSize={6}
              fontWeight={700}
              letterSpacing="0.1em"
              style={{ transition: "fill 0.4s ease" }}
            >
              {intg.name.length > 7 ? intg.name.slice(0, 5) + "…" : intg.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Sub-component: Integration Dossier (floating detail) ────────────────── */

function IntegrationDossier({ integration }: { integration: IntegrationPartner }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row items-start gap-4 p-5 rounded-xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-md"
    >
      <div
        className="w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 text-xs font-mono font-bold"
        style={{
          borderColor: `${integration.color}40`,
          backgroundColor: `${integration.color}10`,
          color: integration.color,
        }}
      >
        {integration.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-semibold text-white">{integration.name}</span>
          <span className="mk-mono-label-xs text-slate-500">{integration.syncType}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{integration.afendaAdds}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 self-center">
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ backgroundColor: integration.color, animation: "mk-ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }}
          />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: integration.color }} />
        </span>
        <span className="mk-mono-label-xxs text-slate-500">LIVE</span>
      </div>
    </motion.div>
  );
}

/* ── Sub-component: Sync Terminal ────────────────────────────────────────── */

function SyncTerminal({ activeIndex }: { activeIndex: number }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inView = useInView(terminalRef, { once: false, amount: 0.3 });

  useEffect(() => {
    if (!inView) return;
    if (visibleCount >= SYNC_EVENTS.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => Math.min(c + 1, SYNC_EVENTS.length)), 2200);
    return () => clearTimeout(timer);
  }, [visibleCount, inView]);

  const dirColor = (dir: SyncEvent["direction"]) => {
    if (dir === "←") return "text-teal-500";
    if (dir === "→") return "text-emerald-400";
    return "text-cyan-400";
  };

  return (
    <div ref={terminalRef} className="rounded-xl border border-slate-800 bg-[#080A0F] overflow-hidden">
      {/* Terminal chrome */}
      <div className="mk-terminal-chrome rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <div className="mk-terminal-dot" />
          <div className="mk-terminal-dot" />
          <div className="mk-terminal-dot" />
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-teal-500" />
          <span className="mk-mono-label-xs text-slate-500">INTEGRATION SYNC LOG</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="mk-mono-label-xxs text-slate-600">STREAMING</span>
        </div>
      </div>
      {/* Events feed */}
      <div className="p-3 space-y-0.5 max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed">
        {SYNC_EVENTS.slice(0, visibleCount).map((evt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-slate-600 shrink-0">{evt.time}</span>
            <span className={`shrink-0 ${dirColor(evt.direction)}`}>{evt.direction}</span>
            <span className="text-slate-400 shrink-0 w-24 truncate">{evt.source}</span>
            <span className="text-slate-300 flex-1 truncate">{evt.event}</span>
            <span className="text-slate-600 shrink-0 hidden sm:inline">{evt.ref}</span>
            <span className="text-teal-600 shrink-0">{evt.latency}</span>
            <span className={`shrink-0 ${evt.status === "ok" ? "text-emerald-500" : "text-amber-500"}`}>
              {evt.status === "ok" ? "✓" : "⚠"}
            </span>
          </motion.div>
        ))}
        {/* Blinking cursor */}
        <div className="flex items-center gap-2 py-1 px-2">
          <span className="text-slate-600">&gt;</span>
          <motion.span
            className="w-1.5 h-3.5 bg-teal-500/70"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Sub-component: Throughput Metrics ───────────────────────────────────── */

function ThroughputStats() {
  return (
    <div className="grid grid-cols-2 gap-3 h-full content-center">
      {THROUGHPUT_STATS.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-xl border border-slate-800/50 bg-slate-900/40 text-center"
        >
          <p
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: stat.accent }}
          >
            {stat.value}
          </p>
          <p className="mk-mono-label-xs text-slate-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Sub-component: Integration cards grid ───────────────────────────────── */

function IntegrationGrid({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {INTEGRATIONS.map((intg, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={intg.id}
            type="button"
            onClick={() => onSelect(i)}
            className={`
              p-3 rounded-lg border text-left transition-all duration-300
              ${
                isActive
                  ? "border-slate-700 bg-slate-800/60"
                  : "border-slate-800/40 bg-slate-900/20 hover:bg-slate-800/30 hover:border-slate-700"
              }
            `}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0 transition-all duration-300"
                style={{
                  backgroundColor: isActive ? intg.color : "#334155",
                  boxShadow: isActive ? `0 0 8px ${intg.color}` : "none",
                }}
              />
              <span
                className={`text-xs font-mono font-semibold tracking-wider transition-colors duration-300 ${
                  isActive ? "text-white" : "text-slate-500"
                }`}
              >
                {intg.name}
              </span>
            </div>
            {isActive && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-[10px] text-slate-400 mt-2 leading-relaxed"
              >
                {intg.syncType}
              </motion.p>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════════════════ */

export function EcosystemConstellation() {
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: false, amount: 0.15 });

  /* ── Auto-cycle integrations ── */
  const [activeIndex, setActiveIndex] = useState(0);
  const [userSelected, setUserSelected] = useState(false);

  useEffect(() => {
    if (!inView || userSelected) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % INTEGRATIONS.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [inView, userSelected]);

  // Resume auto-cycle after user inactivity
  useEffect(() => {
    if (!userSelected) return;
    const timer = setTimeout(() => setUserSelected(false), 8000);
    return () => clearTimeout(timer);
  }, [userSelected, activeIndex]);

  const handleSelectIntegration = useCallback((i: number) => {
    setActiveIndex(i);
    setUserSelected(true);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="ecosystem"
      className="py-32 mk-section-deep overflow-hidden border-t border-slate-900 relative z-10"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 mk-glow-center pointer-events-none" />

      <div className="mk-container relative z-10">
        {/* ── Section Header ── */}
        <motion.div
          className="text-center mb-16 lg:mb-20"
          initial={prefersReduced ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <Badge
            variant="outline"
            className="mb-6 border-teal-900/50 text-teal-400 font-mono tracking-[0.2em] uppercase text-[10px] bg-teal-950/20 px-3 py-1"
          >
            <ArrowRightLeft className="w-3 h-3" />
            The Nexus
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight mb-6 leading-[1.05]">
            One truth layer.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400">
              Every system connected.
            </span>
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto font-light leading-relaxed">
            AFENDA doesn&apos;t replace your ERP. It sits between your operational systems
            and the regulators, auditors, and CFOs who demand verifiable truth —
            a cryptographic bridge that makes <em>every</em> platform trustworthy.
          </p>
        </motion.div>

        {/* ── Constellation Diagram ── */}
        <motion.div
          className="relative mx-auto max-w-5xl mb-12"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <ConstellationSVG
            activeIndex={activeIndex}
            onSelectIntegration={handleSelectIntegration}
            prefersReduced={prefersReduced}
          />
        </motion.div>

        {/* ── Active Integration Dossier ── */}
        <div className="max-w-3xl mx-auto mb-12">
          <AnimatePresence mode="wait">
            {INTEGRATIONS[activeIndex] && (
              <IntegrationDossier
                key={INTEGRATIONS[activeIndex].id}
                integration={INTEGRATIONS[activeIndex]}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Integration Selector Grid ── */}
        <motion.div
          className="max-w-3xl mx-auto mb-20"
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <IntegrationGrid activeIndex={activeIndex} onSelect={handleSelectIntegration} />
        </motion.div>

        {/* ── Live Sync Terminal + Throughput Stats ── */}
        <motion.div
          className="grid lg:grid-cols-5 gap-6 mb-24"
          initial={prefersReduced ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="lg:col-span-3">
            <SyncTerminal activeIndex={activeIndex} />
          </div>
          <div className="lg:col-span-2">
            <ThroughputStats />
          </div>
        </motion.div>

        {/* ── The Positioning Statement ── */}
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={prefersReduced ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {/* The killer line */}
          <div className="mb-10">
            <p className="text-xl md:text-2xl lg:text-3xl font-light text-slate-400 leading-relaxed tracking-tight">
              SAP moves your data.&ensp;Oracle stores your data.
              <br className="hidden md:block" />
              QuickBooks books your data.&ensp;Xero reconciles your data.
            </p>
            <p className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white mt-4 tracking-tight">
              AFENDA{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                proves
              </span>{" "}
              your data.
            </p>
          </div>

          {/* Supporting copy */}
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            We don&apos;t compete with the platforms you already trust. We add the
            layer they were never built to provide: verifiable, cryptographic,
            regulatory truth — across every system, every entity, every jurisdiction.
          </p>

          {/* Proof points */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-6">
            {[
              "Append-only audit ledger",
              "Zero-trust verification",
              "180+ jurisdiction compliance",
              "Event-sourced architecture",
            ].map((point) => (
              <div key={point} className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-teal-500" />
                <span className="text-xs font-mono text-slate-400 tracking-wider">{point}</span>
              </div>
            ))}
          </div>

          {/* Mono footer */}
          <p className="mk-mono-label-xs text-slate-600 mt-10 tracking-[0.25em]">
            THE MISSING LAYER FOR MODERN ENTERPRISE FINANCE
          </p>
        </motion.div>
      </div>
    </section>
  );
}
