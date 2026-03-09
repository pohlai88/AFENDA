"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { Badge } from "./_landing-ui";
import {
  Brain,
  Fingerprint,
  GitBranch,
  Lock,
  Search,
  Shield,
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  CornerDownRight,
  Eye,
  Activity,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════════
   THE TRUTH CORTEX
   "Not a dashboard that shows data. A mind that understands it."

   This is an *intelligent* financial system — it thinks, reasons, predicts,
   decides, and explains WHY. Each panel demonstrates a different cognitive
   capability:

   1. NEURAL INSIGHT STREAM — AI reasoning typed in real-time, showing HOW
      the engine arrives at conclusions (causal chains, not bullet points)
   2. CAUSAL GRAPH — Interactive SVG lineage showing how one anomaly triggers
      a cascade of autonomous decisions across the entire ledger
   3. DECISION TRACE — Full reasoning log of autonomous actions the engine
      took, with confidence scores and rule references
   4. PATTERN CORTEX — Visual neural map of cross-entity correlations the
      engine discovered on its own

   The metaphor: a neural cortex — synapses firing, patterns emerging,
   decisions being made in real-time. NOT a spreadsheet with charts.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Neural insight data ─────────────────────────────────────────────────── */

interface Insight {
  id: string;
  thought: string;
  reasoning: string;
  conclusion: string;
  confidence: number;
  type: "prediction" | "anomaly" | "optimization" | "correlation";
}

const INSIGHTS: Insight[] = [
  {
    id: "INS-01",
    thought: "Analyzing Q4 EMEA cash outflows against seasonal norms...",
    reasoning: "EMEA Q4 expenditure is +18% vs. trailing 4Q avg. However, 73% maps to pre-approved CapEx (PO-2025-0891, PO-2025-0904). Remaining 27% correlates with FX hedging on EUR/GBP. No rogue spend detected.",
    conclusion: "EMEA Q4 variance is explainable. No intervention required.",
    confidence: 96,
    type: "anomaly",
  },
  {
    id: "INS-02",
    thought: "Forecasting APAC cash position for next 90 days...",
    reasoning: "AR aging trend shows DSO improving 2.1 days/quarter. Weighted by supplier payment schedules and pipeline commitments, projected net position is +$1.8M by EOQ with 89% confidence band.",
    conclusion: "Liquidity forecast: green. Recommend accelerating SUP-0712 early-pay discount ($42k saving).",
    confidence: 89,
    type: "prediction",
  },
  {
    id: "INS-03",
    thought: "Cross-entity pattern detected across 3 subsidiaries...",
    reasoning: "AMER, EMEA, and APAC all show correlated spikes in consulting invoices from the same vendor group (Vendor Cluster #7) within ±3 days. Historical pattern repeat rate: 4 of last 6 quarters.",
    conclusion: "Recommend consolidated master agreement. Estimated savings: $340k/yr.",
    confidence: 84,
    type: "correlation",
  },
  {
    id: "INS-04",
    thought: "Evaluating approval queue bottleneck...",
    reasoning: "CFO approval queue averages 3.2 days for invoices >$50k. 67% of these match prior-approved PO line items with <2% variance. Auto-approval rule would reduce cycle time to 0.4 days without increasing risk above org tolerance (0.5% threshold).",
    conclusion: "Auto-approval rule drafted for review. Expected throughput gain: +312%.",
    confidence: 92,
    type: "optimization",
  },
];

const insightMeta: Record<Insight["type"], { icon: React.ElementType; color: string; label: string; glow: string }> = {
  prediction:   { icon: Sparkles,      color: "#14b8a6", label: "PREDICTION",   glow: "rgba(20,184,166,0.15)" },
  anomaly:      { icon: Search,        color: "#f59e0b", label: "ANALYSIS",     glow: "rgba(245,158,11,0.15)" },
  optimization: { icon: Zap,           color: "#10b981", label: "OPTIMIZATION", glow: "rgba(16,185,129,0.15)" },
  correlation:  { icon: GitBranch,     color: "#8b5cf6", label: "CORRELATION",  glow: "rgba(139,92,246,0.15)" },
};

/* ── Causal graph nodes ──────────────────────────────────────────────────── */

interface CausalNode {
  id: string;
  label: string;
  shortLabel: string;
  type: "trigger" | "analysis" | "decision" | "action" | "outcome";
  x: number;
  y: number;
}

interface CausalEdge {
  from: string;
  to: string;
  label: string;
}

const CAUSAL_NODES: CausalNode[] = [
  { id: "C1", label: "Duplicate INV-4283 submitted",           shortLabel: "TRIGGER",    type: "trigger",  x: 70,  y: 78  },
  { id: "C2", label: "SHA-256 hash matches INV-4281",          shortLabel: "HASH MATCH", type: "analysis", x: 236, y: 52  },
  { id: "C3", label: "Amount identical: $142,800.00",          shortLabel: "AMT CHECK",  type: "analysis", x: 236, y: 122 },
  { id: "C4", label: "Confidence: 98.2% duplicate",            shortLabel: "98.2%",      type: "decision", x: 402, y: 78  },
  { id: "C5", label: "Auto-block: Policy AP-DUP-001",          shortLabel: "BLOCKED",    type: "action",   x: 558, y: 52  },
  { id: "C6", label: "Alert: CFO + AP Manager notified",       shortLabel: "ALERTED",    type: "action",   x: 558, y: 122 },
  { id: "C7", label: "Supplier flagged for review",            shortLabel: "FLAGGED",    type: "outcome",  x: 708, y: 78  },
];

const CAUSAL_EDGES: CausalEdge[] = [
  { from: "C1", to: "C2", label: "hash check" },
  { from: "C1", to: "C3", label: "amt check" },
  { from: "C2", to: "C4", label: "match" },
  { from: "C3", to: "C4", label: "match" },
  { from: "C4", to: "C5", label: "block" },
  { from: "C4", to: "C6", label: "notify" },
  { from: "C5", to: "C7", label: "escalate" },
  { from: "C6", to: "C7", label: "review" },
];

const NODE_STYLES: Record<CausalNode["type"], { fill: string; stroke: string; text: string }> = {
  trigger:  { fill: "#451a03", stroke: "#f59e0b", text: "#fbbf24" },
  analysis: { fill: "#042f2e", stroke: "#14b8a6", text: "#5eead4" },
  decision: { fill: "#1e1b4b", stroke: "#8b5cf6", text: "#c4b5fd" },
  action:   { fill: "#052e16", stroke: "#10b981", text: "#6ee7b7" },
  outcome:  { fill: "#0c1a2a", stroke: "#06b6d4", text: "#67e8f9" },
};

/* ── Autonomous decision log ─────────────────────────────────────────────── */

interface Decision {
  id: string;
  action: string;
  trigger: string;
  rule: string;
  confidence: number;
  outcome: "executed" | "blocked" | "escalated";
  impact: string;
  timestamp: string;
}

const DECISIONS: Decision[] = [
  {
    id: "DEC-001",
    action: "Auto-approved PO-2026-0712",
    trigger: "PO amount $34,500 matches budget line BUD-EMEA-2026-Q1-IT (< 2% variance)",
    rule: "RULE:AP-AUTO-001 — Pre-approved PO line items within tolerance",
    confidence: 99,
    outcome: "executed",
    impact: "Saved 3.1 days approval time",
    timestamp: "0.8s ago",
  },
  {
    id: "DEC-002",
    action: "Blocked duplicate INV-2026-4283",
    trigger: "SHA-256 content hash collides with INV-2026-4281 (submitted 14 days prior)",
    rule: "RULE:AP-DUP-001 — Duplicate detection via content fingerprint",
    confidence: 98,
    outcome: "blocked",
    impact: "Prevented $142,800 duplicate payment",
    timestamp: "28s ago",
  },
  {
    id: "DEC-003",
    action: "Escalated FX-EUR-USD variance",
    trigger: "Spot rate deviation > 2σ from 30-day EWMA (current: 1.0847 vs mean: 1.0791)",
    rule: "RULE:FX-MON-003 — Statistical outlier detection on FX rates",
    confidence: 87,
    outcome: "escalated",
    impact: "Treasury team notified for manual review",
    timestamp: "3m ago",
  },
];

const outcomeMeta: Record<Decision["outcome"], { color: string; bg: string; icon: React.ElementType }> = {
  executed:  { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  blocked:   { color: "text-rose-400",    bg: "bg-rose-500/10",    icon: XCircle },
  escalated: { color: "text-amber-400",   bg: "bg-amber-500/10",   icon: AlertTriangle },
};

/* ── Pattern cortex data ─────────────────────────────────────────────────── */

interface PatternNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  pulseDelay: number;
}

interface PatternLink {
  from: string;
  to: string;
  strength: number; // 0-1
}

const PATTERN_NODES: PatternNode[] = [
  { id: "P1",  label: "AP",      x: 120, y: 80,  radius: 18, color: "#14b8a6", pulseDelay: 0 },
  { id: "P2",  label: "AR",      x: 280, y: 60,  radius: 15, color: "#06b6d4", pulseDelay: 0.3 },
  { id: "P3",  label: "GL",      x: 200, y: 160, radius: 22, color: "#10b981", pulseDelay: 0.6 },
  { id: "P4",  label: "FX",      x: 380, y: 130, radius: 12, color: "#f59e0b", pulseDelay: 0.9 },
  { id: "P5",  label: "BANK",    x: 80,  y: 180, radius: 14, color: "#8b5cf6", pulseDelay: 0.2 },
  { id: "P6",  label: "TAX",     x: 340, y: 200, radius: 11, color: "#ec4899", pulseDelay: 0.5 },
  { id: "P7",  label: "PROC",    x: 160, y: 250, radius: 13, color: "#06b6d4", pulseDelay: 0.8 },
  { id: "P8",  label: "ENTITY",  x: 420, y: 50,  radius: 10, color: "#14b8a6", pulseDelay: 0.4 },
];

const PATTERN_LINKS: PatternLink[] = [
  { from: "P1", to: "P3", strength: 0.9 },
  { from: "P2", to: "P3", strength: 0.85 },
  { from: "P3", to: "P5", strength: 0.7 },
  { from: "P1", to: "P4", strength: 0.5 },
  { from: "P4", to: "P6", strength: 0.6 },
  { from: "P2", to: "P8", strength: 0.4 },
  { from: "P5", to: "P7", strength: 0.55 },
  { from: "P1", to: "P7", strength: 0.65 },
  { from: "P3", to: "P6", strength: 0.75 },
  { from: "P4", to: "P8", strength: 0.3 },
];

/* ── Typing animation hook ───────────────────────────────────────────────── */

function useTypingAnimation(text: string, speed: number, active: boolean) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(""); setDone(false); return; }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, active]);

  return { displayed, done };
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Neural Insight Stream ───────────────────────────────────────────────── */

function NeuralInsightStream() {
  const [activeInsight, setActiveInsight] = useState(0);
  const insight = INSIGHTS[activeInsight]!;
  const meta = insightMeta[insight.type];
  const Icon = meta.icon;

  const { displayed: thoughtText, done: thoughtDone } = useTypingAnimation(
    insight.thought, 20, true
  );
  const { displayed: reasoningText, done: reasoningDone } = useTypingAnimation(
    insight.reasoning, 12, thoughtDone
  );
  const { displayed: conclusionText } = useTypingAnimation(
    insight.conclusion, 15, reasoningDone
  );

  /* Auto-cycle through insights */
  useEffect(() => {
    if (!reasoningDone) return;
    const timer = setTimeout(() => {
      setActiveInsight((prev) => (prev + 1) % INSIGHTS.length);
    }, 4000);
    return () => clearTimeout(timer);
  }, [reasoningDone]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-gradient-to-b from-[#061126]/85 to-[#030b1b]/95 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[10px] font-mono text-slate-400 tracking-[0.18em] uppercase">Neural Insight Stream</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="w-2.5 h-2.5 text-teal-400 animate-pulse" />
          <span className="text-[9px] font-mono text-teal-400 tracking-[0.16em]">REASONING</span>
        </div>
      </div>

      {/* Insight selector dots */}
      <div className="flex items-center gap-3 px-4 pt-3">
        {INSIGHTS.map((ins, i) => {
          const m = insightMeta[ins.type];
          return (
            /* shadcn-exempt: Marketing page insight selector */
            <button
              key={ins.id}
              type="button"
              onClick={() => setActiveInsight(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono tracking-[0.12em] uppercase transition-all ${
                i === activeInsight
                  ? "text-white border border-slate-700 bg-slate-900/70"
                  : "text-slate-600 border border-transparent hover:text-slate-400"
              }`}
              style={i === activeInsight ? { backgroundColor: m.glow } : undefined}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Reasoning trace */}
      <div className="p-4 space-y-3 min-h-[208px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={insight.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Thought */}
            <div className="flex items-start gap-2 mb-3">
              <div className="p-1 rounded shrink-0 mt-0.5" style={{ backgroundColor: meta.glow }}>
                <Icon className="w-3 h-3" style={{ color: meta.color }} />
              </div>
              <div>
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.16em] mb-1">THINKING</p>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                  {thoughtText}
                  {!thoughtDone && <span className="inline-block w-1.5 h-3 bg-teal-400 ml-0.5 animate-pulse" />}
                </p>
              </div>
            </div>

            {/* Reasoning chain */}
            {thoughtDone && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-6 pl-3 border-l border-slate-700/70"
              >
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.16em] mb-1 flex items-center gap-1">
                  <CornerDownRight className="w-2.5 h-2.5" />REASONING
                </p>
                <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
                  {reasoningText}
                  {!reasoningDone && <span className="inline-block w-1.5 h-3 bg-slate-500 ml-0.5 animate-pulse" />}
                </p>
              </motion.div>
            )}

            {/* Conclusion */}
            {reasoningDone && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 ml-6 p-3 rounded-lg border"
                style={{
                  backgroundColor: meta.glow,
                  borderColor: `${meta.color}30`,
                }}
              >
                <p className="text-[9px] font-mono uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: meta.color }}>
                  <CheckCircle2 className="w-2.5 h-2.5" />CONCLUSION · {insight.confidence}% CONFIDENCE
                </p>
                <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                  {conclusionText}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Causal Graph ────────────────────────────────────────────────────────── */

function CausalGraph() {
  const [revealedNodes, setRevealedNodes] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const graphInView = useInView(graphRef, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!graphInView) return;
    const timers = CAUSAL_NODES.map((_, i) =>
      setTimeout(() => setRevealedNodes(i + 1), 300 + i * 400)
    );
    return () => timers.forEach(clearTimeout);
  }, [graphInView]);

  const getNode = useCallback((id: string) => CAUSAL_NODES.find((n) => n.id === id), []);
  const curvePath = useCallback((from: CausalNode, to: CausalNode) => {
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2 + (Math.abs(from.y - to.y) > 25 ? -8 : 0);
    return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  }, []);

  return (
    <div ref={graphRef} className="overflow-hidden rounded-xl border border-slate-800/60 bg-gradient-to-b from-[#061126]/85 to-[#030b1b]/95 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-800/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] font-mono text-slate-400 tracking-[0.18em] uppercase">Causal Lineage Graph</span>
        </div>
        <span className="text-[9px] font-mono text-slate-600 tracking-wide">
          Event: Duplicate INV-4283
        </span>
      </div>

      <div className="p-2">
        <svg viewBox="0 0 780 290" className="h-auto w-full">
          <rect x="2" y="2" width="776" height="286" rx="12" fill="none" stroke="rgba(51,65,85,0.3)" strokeWidth="1" />

          {/* Edges */}
          {CAUSAL_EDGES.map((edge) => {
            const fromNode = getNode(edge.from);
            const toNode = getNode(edge.to);
            if (!fromNode || !toNode) return null;
            const fromIdx = CAUSAL_NODES.indexOf(fromNode);
            const toIdx = CAUSAL_NODES.indexOf(toNode);
            const visible = fromIdx < revealedNodes && toIdx < revealedNodes;
            const fromStyle = NODE_STYLES[fromNode.type];

            return (
              <motion.path
                key={`${edge.from}-${edge.to}`}
                d={curvePath(fromNode, toNode)}
                stroke={fromStyle.stroke}
                strokeWidth={1.6}
                strokeDasharray="8 7"
                fill="none"
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: visible ? 0.55 : 0 }}
                transition={{ duration: 0.5 }}
              />
            );
          })}

          {/* Nodes */}
          {CAUSAL_NODES.map((node, i) => {
            const style = NODE_STYLES[node.type];
            const visible = i < revealedNodes;
            const hovered = hoveredNode === node.id;

            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: visible ? 1 : 0,
                  scale: visible ? 1 : 0.5,
                }}
                transition={{ duration: 0.4, delay: 0.1 }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                {/* Glow */}
                {hovered && (
                  <circle cx={node.x} cy={node.y} r={32} fill={style.stroke} opacity={0.12} />
                )}
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={hovered ? 23 : 21}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={hovered ? 2.4 : 2}
                  style={{ transition: "all 200ms" }}
                />
                {/* Short label */}
                <text
                  x={node.x}
                  y={node.y + 1.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={style.text}
                  fontSize={node.shortLabel === "98.2%" ? 10 : 6.8}
                  fontFamily="monospace"
                  fontWeight={700}
                  letterSpacing="0.1em"
                >
                  {node.shortLabel}
                </text>

                {/* Expanded tooltip on hover */}
                {hovered && (
                  <g>
                    <rect x={node.x - 92} y={node.y + 28} width="184" height="34" rx="6" fill="rgba(2,6,23,0.95)" stroke="rgba(71,85,105,0.8)" strokeWidth="1" />
                    <text x={node.x} y={node.y + 49} textAnchor="middle" fill="rgba(203,213,225,0.95)" fontSize="9" fontFamily="monospace" letterSpacing="0.04em">
                      {node.label}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}

          {/* Flow arrows between column groups */}
          {[170, 336, 502].map((x) => (
            <motion.g
              key={x}
              initial={{ opacity: 0 }}
              animate={{ opacity: revealedNodes > 2 ? 0.28 : 0 }}
              transition={{ delay: 1 }}
            >
              <path
                d={`M${x - 12},182 L${x + 8},182`}
                stroke="#475569"
                strokeWidth={1.2}
                markerEnd="url(#arrowhead)"
              />
            </motion.g>
          ))}

          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="#475569" />
            </marker>
          </defs>

          {/* Column labels */}
          {[
            { x: 70,  label: "TRIGGER" },
            { x: 236, label: "ANALYSIS" },
            { x: 402, label: "DECISION" },
            { x: 558, label: "ACTION" },
            { x: 708, label: "OUTCOME" },
          ].map((col) => (
            <text
              key={col.label}
              x={col.x}
              y={250}
              textAnchor="middle"
              fill="#334155"
              fontSize={8.5}
              fontFamily="monospace"
              fontWeight={700}
              letterSpacing="0.18em"
            >
              {col.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ── Decision Trace ──────────────────────────────────────────────────────── */

function DecisionTrace() {
  const [expandedId, setExpandedId] = useState<string | null>("DEC-002");

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-gradient-to-b from-[#061126]/85 to-[#030b1b]/95 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono text-slate-400 tracking-[0.18em] uppercase">Autonomous Decision Log</span>
        </div>
        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 tracking-[0.14em]">
          <Lock className="w-2.5 h-2.5" />IMMUTABLE
        </span>
      </div>

      <div className="p-3 space-y-2">
        {DECISIONS.map((dec) => {
          const meta = outcomeMeta[dec.outcome];
          const Icon = meta.icon;
          const expanded = expandedId === dec.id;

          return (
            /* shadcn-exempt: Marketing page decision trace toggle */
            <button
              key={dec.id}
              type="button"
              onClick={() => setExpandedId(expanded ? null : dec.id)}
              className="w-full text-left"
            >
              <div className={`rounded-lg border transition-all ${
                expanded ? "border-slate-700 bg-slate-900/80 shadow-[inset_0_1px_0_rgba(148,163,184,0.07)]" : "border-slate-800/40 bg-slate-900/40 hover:border-slate-700/60"
              }`}>
                {/* Summary */}
                <div className="flex items-center gap-3 p-3">
                  <div className={`p-1.5 rounded-md ${meta.bg} shrink-0`}>
                    <Icon className={`w-3 h-3 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-slate-300 truncate">{dec.action}</p>
                    <p className="text-[9px] font-mono text-slate-600 mt-0.5">{dec.timestamp} · {dec.confidence}% confidence</p>
                  </div>
                  <ArrowRight className={`w-3 h-3 text-slate-600 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                </div>

                {/* Expanded reasoning */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/40">
                        <div>
                          <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">TRIGGER</p>
                          <p className="text-[10px] font-mono text-slate-400 leading-relaxed">{dec.trigger}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-0.5">RULE APPLIED</p>
                          <p className="text-[10px] font-mono text-teal-400/80 leading-relaxed">{dec.rule}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/30">
                          <span className="text-[9px] font-mono text-slate-600">IMPACT</span>
                          <span className="text-[10px] font-mono text-emerald-400 font-medium">{dec.impact}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Pattern Cortex ──────────────────────────────────────────────────────── */

function PatternCortex() {
  const cortexRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cortexRef, { once: true, margin: "-50px" });
  const [activeLink, setActiveLink] = useState<string | null>(null);

  const getNode = useCallback((id: string) => PATTERN_NODES.find((n) => n.id === id), []);

  return (
    <div ref={cortexRef} className="overflow-hidden rounded-xl border border-slate-800/60 bg-gradient-to-b from-[#061126]/85 to-[#030b1b]/95 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-mono text-slate-400 tracking-[0.18em] uppercase">Pattern Cortex</span>
        </div>
        <span className="text-[9px] font-mono text-slate-600 tracking-wide">
          10 correlations detected
        </span>
      </div>

      <div className="p-2 relative">
        <svg viewBox="0 0 500 290" className="w-full h-auto">
          {/* Links */}
          {PATTERN_LINKS.map((link) => {
            const fromNode = getNode(link.from);
            const toNode = getNode(link.to);
            if (!fromNode || !toNode) return null;
            const linkId = `${link.from}-${link.to}`;
            const highlighted = activeLink === linkId;

            return (
              <motion.line
                key={linkId}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={highlighted ? "#14b8a6" : "#1e293b"}
                strokeWidth={highlighted ? 2 : link.strength * 2}
                strokeOpacity={inView ? (highlighted ? 0.8 : link.strength * 0.5) : 0}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: inView ? 1 : 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                onMouseEnter={() => setActiveLink(linkId)}
                onMouseLeave={() => setActiveLink(null)}
                className="cursor-pointer"
              />
            );
          })}

          {/* Nodes */}
          {PATTERN_NODES.map((node) => (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: inView ? 1 : 0, scale: inView ? 1 : 0 }}
              transition={{ duration: 0.5, delay: node.pulseDelay + 0.3 }}
            >
              {/* Outer pulse ring */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius + 6}
                fill="none"
                stroke={node.color}
                strokeWidth={0.5}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: inView ? [0, 0.3, 0] : 0,
                  scale: inView ? [0.8, 1.3, 0.8] : 0.8,
                }}
                transition={{
                  duration: 3,
                  delay: node.pulseDelay + 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {/* Node */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={`${node.color}15`}
                stroke={node.color}
                strokeWidth={1}
              />
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={node.color}
                fontSize={8}
                fontFamily="monospace"
                fontWeight={600}
              >
                {node.label}
              </text>
            </motion.g>
          ))}
        </svg>

        {/* Discovered pattern callout */}
          <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 10 }}
          transition={{ delay: 2 }}
          className="mx-2 mb-2 p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20 shadow-[inset_0_1px_0_rgba(196,181,253,0.08)]"
        >
          <p className="text-[9px] font-mono text-violet-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />DISCOVERED PATTERN
          </p>
          <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
            Strong correlation (r=0.91) between AP → GL posting latency and BANK reconciliation drift.
            Reducing AP cycle time by 1 day predicts 23% fewer reconciliation exceptions.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — THE TRUTH CORTEX
   ══════════════════════════════════════════════════════════════════════════ */

export function DashboardPreview() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section ref={sectionRef} className="py-32 border-t border-slate-900 relative z-10" id="dashboard">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.04)_0%,_transparent_60%)] pointer-events-none" />

      <div className="mk-container relative z-10">
        {/* ── Section Header ─────────────────────────────────────────── */}
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="mb-6 border-teal-900/50 text-teal-400 font-mono tracking-[0.2em] uppercase text-[10px] bg-teal-950/20 px-3 py-1"
          >
            Autonomous Financial Intelligence
          </Badge>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6 leading-[1.1]">
            It doesn&apos;t show data. <span className="text-slate-500">It thinks.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light leading-relaxed">
            The Truth Engine doesn&apos;t wait for you to ask questions.
            It reasons across every ledger, detects what&apos;s wrong, explains why, and acts — autonomously.
          </p>
        </div>

        {/* ── Dashboard Chrome ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/90 to-[#020712] shadow-[0_40px_90px_rgba(2,8,23,0.85)]"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#020713]/90 backdrop-blur-md">
            <div className="flex gap-2">
              <div className="mk-terminal-dot" />
              <div className="mk-terminal-dot" />
              <div className="mk-terminal-dot" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-500 tracking-[0.25em]">
                AFENDA // TRUTH_CORTEX
              </span>
              <span className="text-[9px] font-mono text-slate-600 hidden md:inline">
                4 ENTITIES · 8 STREAMS · 3 MODELS ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                <Brain className="w-2.5 h-2.5 text-violet-400" />
                <span className="text-[9px] font-mono text-violet-400 tracking-widest">CORTEX ACTIVE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-mono text-teal-500 tracking-widest">LIVE</span>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(2,6,23,0.36))]">
            {/* Row 1: Neural Insight Stream (full width) */}
            <NeuralInsightStream />

            {/* Row 2: Causal Graph (full width) */}
            <CausalGraph />

            {/* Row 3: Decision Trace + Pattern Cortex */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DecisionTrace />
              <PatternCortex />
            </div>

            {/* ── Bottom Status Bar ──────────────────────────────────── */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/40">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-mono text-slate-600 flex items-center gap-1.5 tracking-[0.12em]">
                  <Brain className="w-2.5 h-2.5 text-violet-500" />
                  CORTEX v3.2 · 4 models · 10 correlations
                </span>
                <span className="text-[9px] font-mono text-slate-700">|</span>
                <span className="text-[9px] font-mono text-slate-600 tracking-[0.1em]">
                  3 autonomous decisions in last 5 min
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-slate-600 flex items-center gap-1 tracking-[0.1em]">
                  <Shield className="w-2.5 h-2.5 text-emerald-500" />
                  $142,800 SAVED
                </span>
                <span className="text-[9px] font-mono text-slate-600 flex items-center gap-1 tracking-[0.1em]">
                  <Eye className="w-2.5 h-2.5 text-teal-500" />
                  ALL DECISIONS AUDITABLE
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
