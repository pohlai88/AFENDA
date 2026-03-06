"use client";

/**
 * /admin/insights — OTel Insight Factory dashboard.
 *
 * Fetches recent Jaeger traces, runs 6 analyzers, and displays
 * ranked, actionable recommendations with evidence and deep-links.
 */

import { useCallback, useEffect, useState } from "react";

/* ── Types (mirrors the API response) ─────────────────────────────────────── */

type InsightSeverity = "critical" | "warning" | "info" | "opportunity";
type InsightCategory =
  | "latency"
  | "errors"
  | "security"
  | "reliability"
  | "throughput"
  | "data-quality";

interface Insight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  description: string;
  recommendations: string[];
  evidence: Record<string, string | number>;
  jaegerUrl?: string;
}

interface InsightReport {
  generatedAt: string;
  traceCount: number;
  spanCount: number;
  insights: Insight[];
  analyzerErrors: { analyzer: string; error: string }[];
  jaegerUrl: string;
}

/* ── Severity → Design-system token mapping ──────────────────────────────── */

const SEV_CONFIG: Record<
  InsightSeverity,
  { icon: string; label: string; token: string }
> = {
  critical:    { icon: "⛔", label: "Critical",    token: "destructive" },
  warning:     { icon: "⚠️", label: "Warning",     token: "warning" },
  info:        { icon: "ℹ️", label: "Info",         token: "info" },
  opportunity: { icon: "💡", label: "Opportunity",  token: "success" },
};

/** Derive severity inline styles from a DS status token.
 *  Uses `color-mix(in oklab)` — same technique as the DS overlay system.
 *  All values resolve to OKLCH at runtime → auto-adapt to dark/light. */
function sevStyles(token: string) {
  const color = `var(--${token})`;
  return {
    color,
    bg: `color-mix(in oklab, ${color}, transparent 88%)`,
    border: `color-mix(in oklab, ${color}, transparent 60%)`,
    badge: `color-mix(in oklab, ${color}, transparent 80%)`,
  };
}

const CAT_LABELS: Record<InsightCategory, { icon: string; label: string }> = {
  latency:        { icon: "⏱", label: "Latency" },
  errors:         { icon: "🔴", label: "Errors" },
  security:       { icon: "🛡", label: "Security" },
  reliability:    { icon: "🔄", label: "Reliability" },
  throughput:     { icon: "📊", label: "Throughput" },
  "data-quality": { icon: "📋", label: "Data Quality" },
};

/* ── Component ────────────────────────────────────────────────────────────── */

export default function InsightsPage() {
  const [report, setReport] = useState<InsightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | "all">("all");

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/internal/insights");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      const data = (await res.json()) as InsightReport;
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchInsights(); }, [fetchInsights]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered =
    report?.insights.filter(
      (i) => categoryFilter === "all" || i.category === categoryFilter,
    ) ?? [];

  /* ── Severity summary counts ──────────────────────────────────────────── */
  const counts: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
    opportunity: 0,
  };
  for (const i of report?.insights ?? []) counts[i.severity]++;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            OTel Insight Factory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated recommendations from your Jaeger trace data
          </p>
        </div>
        <button
          onClick={() => void fetchInsights()}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Refresh"}
        </button>
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {error && (
        <div
          className="p-4 rounded-lg border text-sm"
          style={{
            backgroundColor: "color-mix(in oklab, var(--destructive), transparent 88%)",
            borderColor: "color-mix(in oklab, var(--destructive), transparent 60%)",
            color: "var(--destructive)",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      {report && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Traces analyzed" value={report.traceCount} />
          <StatCard label="Spans processed" value={report.spanCount} />
          <StatCard
            label="Insights"
            value={report.insights.length}
            sub={
              counts.critical > 0
                ? `${counts.critical} critical`
                : counts.warning > 0
                  ? `${counts.warning} warnings`
                  : "all clear"
            }
          />
          <StatCard
            label="Generated"
            value={new Date(report.generatedAt).toLocaleTimeString()}
          />
        </div>
      )}

      {/* ── Severity badges ───────────────────────────────────────────────── */}
      {report && !loading && report.insights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["critical", "warning", "info", "opportunity"] as const).map(
            (s) => {
              const cfg = SEV_CONFIG[s];
              const ss = sevStyles(cfg.token);
              return counts[s] > 0 ? (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: ss.bg, color: ss.color }}
                >
                  {cfg.icon} {counts[s]} {cfg.label}
                </span>
              ) : null;
            },
          )}
        </div>
      )}

      {/* ── Category filter ───────────────────────────────────────────────── */}
      {report && !loading && report.insights.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-lg ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-surface-100 text-foreground-secondary"}`}
          >
            All ({report.insights.length})
          </button>
          {(Object.keys(CAT_LABELS) as InsightCategory[]).map((cat) => {
            const n = report.insights.filter((i) => i.category === cat).length;
            if (n === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg ${categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-surface-100 text-foreground-secondary"}`}
              >
                {CAT_LABELS[cat].icon} {CAT_LABELS[cat].label} ({n})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Insight cards ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="mt-3 text-sm">Analyzing traces\u2026</p>
        </div>
      )}

      {report && !loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No insights found</p>
          <p className="text-sm mt-1">
            {report.traceCount === 0
              ? "No traces available in Jaeger. Send some requests to the API first."
              : "All clear — no anomalies detected in the analyzed traces."}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((insight) => {
          const sev = SEV_CONFIG[insight.severity];
          const ss = sevStyles(sev.token);
          const cat = CAT_LABELS[insight.category];
          const isOpen = expanded.has(insight.id);

          return (
            <div
              key={insight.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ backgroundColor: ss.bg, borderColor: ss.border }}
            >
              {/* Card header */}
              <button
                onClick={() => toggle(insight.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3"
              >
                <span className="text-lg mt-0.5">{sev.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{ color: ss.color, backgroundColor: ss.badge }}
                    >
                      {sev.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cat.icon} {cat.label}
                    </span>
                  </div>
                  <h3
                    className="font-semibold mt-1"
                    style={{ color: ss.color }}
                  >
                    {insight.title}
                  </h3>
                  <p className="text-sm text-foreground-secondary mt-1">
                    {insight.description}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm mt-1 shrink-0">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-5 pb-5 pt-0 space-y-4 border-t border-border-subtle">
                  {/* Recommendations */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Recommendations
                    </h4>
                    <ol className="space-y-1.5">
                      {insight.recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="text-sm text-foreground-secondary flex gap-2"
                        >
                          <span className="shrink-0 text-muted-foreground font-mono text-xs mt-0.5">
                            {i + 1}.
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Evidence */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Evidence
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(insight.evidence).map(([k, v]) => (
                        <div
                          key={k}
                          className="bg-surface-200 rounded-lg px-3 py-2"
                        >
                          <div className="text-xs text-muted-foreground font-mono">
                            {k}
                          </div>
                          <div className="text-sm font-medium text-foreground truncate">
                            {String(v)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Jaeger deep link */}
                  {insight.jaegerUrl && (
                    <a
                      href={insight.jaegerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      🔍 Investigate in Jaeger →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Analyzer errors ───────────────────────────────────────────────── */}
      {report &&
        report.analyzerErrors.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-surface-100 text-sm">
            <h3 className="font-semibold text-foreground-secondary mb-2">
              Analyzer Errors
            </h3>
            {report.analyzerErrors.map((e, i) => (
              <div key={i} className="text-muted-foreground">
                <code className="text-xs">{e.analyzer}</code>: {e.error}
              </div>
            ))}
          </div>
        )}

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <div className="mt-8 p-6 rounded-xl bg-surface-100 border">
        <h3 className="font-semibold text-foreground mb-3">
          How the Insight Factory works
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div>
            <div className="font-medium text-foreground mb-1">
              1. Collect
            </div>
            Fetches up to 200 recent traces from Jaeger&apos;s Query API with all
            spans, tags, and process metadata.
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">
              2. Analyze
            </div>
            6 pluggable analyzers inspect normalised spans for latency
            anomalies, error hotspots, security signals, reliability patterns,
            traffic distribution, and data quality.
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">
              3. Recommend
            </div>
            Each finding produces severity-ranked insights with concrete
            recommendations and deep-links to the relevant
            Jaeger traces.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold text-foreground mt-1">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}
