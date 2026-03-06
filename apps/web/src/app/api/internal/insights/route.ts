/**
 * GET /api/internal/insights
 *
 * Runs the OTel insight factory against recent Jaeger traces and returns
 * a ranked list of actionable recommendations.
 *
 * Internal only — no auth required (admin-facing).
 */

import { NextResponse } from "next/server";

const JAEGER_URL = process.env.JAEGER_URL ?? "http://localhost:16686";

// ── Inline the insight factory types & logic so we don't import from @afenda/core ──
// (Next.js API routes run on the edge / Node; @afenda/core uses OTel SDK which
//  would pull in heavy deps. We keep the Jaeger HTTP client self-contained here.)

/* ---------- Jaeger API types ---------- */

interface JaegerTag { key: string; type: string; value: string | number | boolean }
interface JaegerLog { timestamp: number; fields: JaegerTag[] }
interface JaegerReference { refType: "CHILD_OF" | "FOLLOWS_FROM"; traceID: string; spanID: string }

interface JaegerSpan {
  traceID: string; spanID: string; operationName: string;
  references: JaegerReference[]; startTime: number; duration: number;
  tags: JaegerTag[]; logs: JaegerLog[]; processID: string;
  warnings: string[] | null;
}

interface JaegerProcess { serviceName: string; tags: JaegerTag[] }
interface JaegerTrace { traceID: string; spans: JaegerSpan[]; processes: Record<string, JaegerProcess>; warnings: string[] | null }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface JaegerApiResponse { data: any; total: number; limit: number; offset: number; errors: string[] | null }

/* ---------- Normalised span ---------- */

interface NormalisedSpan {
  traceID: string; spanID: string; parentSpanID: string | null;
  operationName: string; serviceName: string;
  startTime: number; durationMs: number;
  tags: Map<string, string | number | boolean>;
  logs: JaegerLog[];
  isRoot: boolean; isError: boolean;
  httpMethod: string | null; httpTarget: string | null; httpStatusCode: number | null;
}

/* ---------- Insight types ---------- */

type InsightSeverity = "critical" | "warning" | "info" | "opportunity";
type InsightCategory = "latency" | "errors" | "security" | "reliability" | "throughput" | "data-quality";

interface Insight {
  id: string; severity: InsightSeverity; category: InsightCategory;
  title: string; description: string; recommendations: string[];
  evidence: Record<string, string | number>; jaegerUrl?: string;
}

/* ---------- Helpers ---------- */

function tagVal(tags: JaegerTag[], key: string): string | number | boolean | undefined {
  return tags.find((t) => t.key === key)?.value;
}

function normalise(traces: JaegerTrace[]): NormalisedSpan[] {
  const out: NormalisedSpan[] = [];
  for (const tr of traces) {
    for (const sp of tr.spans) {
      const tm = new Map<string, string | number | boolean>();
      for (const t of sp.tags) tm.set(t.key, t.value);
      const par = sp.references.find((r) => r.refType === "CHILD_OF");
      const sc = tagVal(sp.tags, "http.status_code");
      out.push({
        traceID: sp.traceID, spanID: sp.spanID,
        parentSpanID: par?.spanID ?? null,
        operationName: sp.operationName,
        serviceName: tr.processes[sp.processID]?.serviceName ?? "unknown",
        startTime: sp.startTime, durationMs: sp.duration / 1000,
        tags: tm, logs: sp.logs ?? [],
        isRoot: !par,
        isError: tm.get("error") === true || (typeof sc === "number" && sc >= 500),
        httpMethod: (tagVal(sp.tags, "http.method") as string) ?? null,
        httpTarget: (tagVal(sp.tags, "http.target") as string) ?? null,
        httpStatusCode: typeof sc === "number" ? sc : null,
      });
    }
  }
  return out;
}

function groupBy<T>(items: T[], fn: (i: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of items) { const k = fn(i); if (!m.has(k)) m.set(k, []); m.get(k)!.push(i); }
  return m;
}

function percentile(vals: number[], p: number): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(s.length * (p / 100)) - 1)]!;
}

const med = (v: number[]) => percentile(v, 50);
const SLOW_MS = 500;
const ERR_WARN = 5;
const ERR_CRIT = 20;
const MIN_N = 3;

/* ---------- A1: Slow Operations ---------- */

function slowOps(spans: NormalisedSpan[]): Insight[] {
  const ins: Insight[] = [];
  for (const [op, ss] of groupBy(spans, (s) => s.operationName)) {
    if (ss.length < MIN_N) continue;
    const ds = ss.map((s) => s.durationMs);
    const p50 = med(ds), p95 = percentile(ds, 95), max = Math.max(...ds);
    if (p95 > SLOW_MS) {
      ins.push({
        id: `latency.slow-p95.${op}`, severity: p95 > SLOW_MS * 3 ? "critical" : "warning",
        category: "latency", title: `Slow operation: ${op}`,
        description: `P95 ${p95.toFixed(0)}ms (threshold ${SLOW_MS}ms). Median ${p50.toFixed(0)}ms across ${ss.length} calls.`,
        recommendations: [
          "Investigate the slowest trace in Jaeger to find the bottleneck span",
          "Check if DB queries under this operation have missing indexes",
          p95 > 1000 ? "Consider adding a database query cache or materialized view" : "Profile the hot path for unnecessary allocations",
        ],
        evidence: { operation: op, sampleCount: ss.length, p50Ms: Math.round(p50), p95Ms: Math.round(p95), maxMs: Math.round(max) },
        jaegerUrl: `${JAEGER_URL}/search?service=afenda-api&operation=${encodeURIComponent(op)}&minDuration=${Math.round(p95 * 1000)}us`,
      });
    }
  }
  return ins;
}

/* ---------- A2: Error Hotspots ---------- */

function errorHotspots(spans: NormalisedSpan[]): Insight[] {
  const ins: Insight[] = [];
  const http = spans.filter((s) => s.httpTarget !== null);
  for (const [route, rs] of groupBy(http, (s) => `${s.httpMethod} ${s.httpTarget}`)) {
    if (rs.length < MIN_N) continue;
    const errs = rs.filter((s) => s.httpStatusCode !== null && s.httpStatusCode >= 400);
    const rate = (errs.length / rs.length) * 100;
    if (rate < ERR_WARN) continue;
    const byStatus = [...groupBy(errs, (s) => String(s.httpStatusCode)).entries()].map(([c, ss]) => `${c}: ${ss.length}`).join(", ");
    const dc = new Set<string>(); for (const s of errs) { const c = s.tags.get("afenda.error.code"); if (typeof c === "string") dc.add(c); }
    ins.push({
      id: `errors.hotspot.${route.replace(/\s+/g, "-").replace(/[/:]/g, "_")}`,
      severity: rate >= ERR_CRIT ? "critical" : "warning", category: "errors",
      title: `High error rate: ${route}`,
      description: `${rate.toFixed(0)}% of requests failing (${errs.length}/${rs.length}). Status: ${byStatus}.${dc.size ? ` Domain errors: ${[...dc].join(", ")}.` : ""}`,
      recommendations: [
        errs.some((s) => s.httpStatusCode === 500) ? "Investigate 500 errors — unhandled exceptions" : "Review 4xx responses — validation or auth",
        dc.size ? `Check domain logic for: ${[...dc].join(", ")}` : "Add domain error codes for root cause",
        rate > 50 ? "Error rate above 50% — endpoint may be broken" : "Monitor trend — is this rate increasing?",
      ],
      evidence: { route, totalRequests: rs.length, errorCount: errs.length, errorRate: Number(rate.toFixed(1)), statusBreakdown: byStatus },
    });
  }
  return ins;
}

/* ---------- A3: Security Signals ---------- */

function securitySignals(spans: NormalisedSpan[]): Insight[] {
  const ins: Insight[] = [];
  const SEC_CODES = ["INSUFFICIENT_PERMISSIONS", "FORBIDDEN", "SOD_VIOLATION"];
  const secMap = new Map<string, NormalisedSpan[]>();
  for (const s of spans) {
    const c = s.tags.get("afenda.error.code");
    if (typeof c === "string" && SEC_CODES.some((p) => (c as string).includes(p))) {
      if (!secMap.has(c)) secMap.set(c, []);
      secMap.get(c)!.push(s);
    }
  }
  const f403 = spans.filter((s) => s.httpStatusCode === 403);
  if (f403.length >= 2) {
    const byP = groupBy(f403, (s) => { const p = s.tags.get("afenda.principal.id"); return typeof p === "string" ? p : "anonymous"; });
    for (const [pid, ps] of byP) {
      if (ps.length < 2) continue;
      const routes = [...new Set(ps.map((s) => s.httpTarget).filter(Boolean))];
      ins.push({
        id: `security.repeated-403.${pid.slice(0, 8)}`, severity: ps.length >= 5 ? "critical" : "warning",
        category: "security", title: `Repeated access denials: ${pid === "anonymous" ? "unauth" : pid.slice(0, 8) + "…"}`,
        description: `${ps.length} forbidden for ${pid === "anonymous" ? "unauthenticated" : pid.slice(0, 8) + "…"}. Routes: ${routes.join(", ")}.`,
        recommendations: [
          ps.length >= 10 ? "Possible brute-force / privilege escalation — review audit logs" : "Check role assignments",
          "Verify RBAC config for targeted routes",
          "Consider rate-limiting 403 responses",
        ],
        evidence: { principal: pid === "anonymous" ? "unauthenticated" : pid, denialCount: ps.length, routes: routes.join(", ") },
      });
    }
  }
  for (const [code, cs] of secMap) {
    ins.push({
      id: `security.domain.${code.toLowerCase()}`, severity: cs.length >= 3 ? "critical" : "warning",
      category: "security", title: `Security violation: ${code}`,
      description: `${cs.length} attempts blocked by ${code}.`,
      recommendations: ["Review user permissions", "Check org RBAC", "Flag for security review if repeated"],
      evidence: { errorCode: code, occurrences: cs.length, uniqueTraces: new Set(cs.map((s) => s.traceID)).size },
    });
  }
  return ins;
}

/* ---------- A4: Reliability ---------- */

function reliability(spans: NormalisedSpan[]): Insight[] {
  const ins: Insight[] = [];
  const byKey = new Map<string, NormalisedSpan[]>();
  for (const s of spans) {
    const k = s.tags.get("afenda.idempotency.key");
    if (typeof k === "string") { if (!byKey.has(k)) byKey.set(k, []); byKey.get(k)!.push(s); }
  }
  const replayed = [...byKey.entries()].filter(([, ss]) => ss.length > 1);
  if (replayed.length > 0) {
    const total = replayed.reduce((a, [, ss]) => a + ss.length - 1, 0);
    ins.push({
      id: "reliability.idempotency-replays", severity: total >= 10 ? "warning" : "info", category: "reliability",
      title: `Idempotency replays detected`,
      description: `${replayed.length} keys replayed ${total} times. Possible retry storms.`,
      recommendations: ["Check client retry logic", total >= 10 ? "Investigate network layer" : "Low count is normal", "Verify idempotency cache returns"],
      evidence: { uniqueKeysReplayed: replayed.length, totalReplayCount: total, maxReplays: Math.max(...replayed.map(([, s]) => s.length)) },
    });
  }
  for (const [tid, ts] of groupBy(spans, (s) => s.traceID)) {
    if (ts.length >= 20) {
      const root = ts.find((s) => s.isRoot);
      ins.push({
        id: `reliability.high-fanout.${tid.slice(0, 8)}`, severity: ts.length >= 50 ? "warning" : "info", category: "reliability",
        title: `High span fan-out in trace`, description: `Trace ${tid.slice(0, 16)}… has ${ts.length} spans. May indicate N+1 queries.`,
        recommendations: ["Check for N+1 DB patterns", "Review middleware chain", "Open trace in Jaeger"],
        evidence: { traceID: tid, spanCount: ts.length, rootOperation: root ? `${root.httpMethod} ${root.httpTarget}` : "unknown" },
        jaegerUrl: `${JAEGER_URL}/trace/${tid}`,
      });
    }
  }
  return ins;
}

/* ---------- A5: Throughput ---------- */

function throughput(spans: NormalisedSpan[]): Insight[] {
  const ins: Insight[] = [];
  const roots = spans.filter((s) => s.httpTarget !== null && s.isRoot);
  if (roots.length < MIN_N) return ins;
  const byRoute = groupBy(roots, (s) => `${s.httpMethod} ${s.httpTarget}`);
  const counts = [...byRoute.entries()].map(([r, ss]) => ({ route: r, count: ss.length })).sort((a, b) => b.count - a.count);
  const top = counts.slice(0, 5);
  const total = roots.length;
  const pct = top.reduce((a, r) => a + r.count, 0) / total * 100;
  if (top.length > 0) {
    ins.push({
      id: "throughput.traffic-distribution", severity: "info", category: "throughput",
      title: `Traffic: ${counts.length} endpoints`,
      description: `Top ${top.length} routes = ${pct.toFixed(0)}% traffic. Hottest: ${top[0]!.route} (${top[0]!.count} calls, ${((top[0]!.count / total) * 100).toFixed(0)}%).`,
      recommendations: [
        `Ensure hottest endpoint has caching + connection pooling`,
        pct > 80 ? "Traffic is concentrated — consider load shedding" : "Traffic is well-distributed",
        "Monitor this pattern over time",
      ],
      evidence: { totalRequests: total, endpointCount: counts.length, topRoute: top[0]!.route, topRouteCount: top[0]!.count },
    });
  }
  return ins;
}

/* ---------- A6: Data Quality ---------- */

function dataQuality(spans: NormalisedSpan[]): Insight[] {
  const ins: Insight[] = [];
  const roots = spans.filter((s) => s.isRoot && s.httpTarget !== null);
  if (roots.length < MIN_N) return ins;
  const orgC = (roots.filter((s) => s.tags.has("afenda.org.id")).length / roots.length) * 100;
  const prinC = (roots.filter((s) => s.tags.has("afenda.principal.id")).length / roots.length) * 100;
  const corrC = (roots.filter((s) => s.tags.has("afenda.correlation.id")).length / roots.length) * 100;
  if (orgC === 0 && prinC === 0 && corrC === 0) {
    ins.push({
      id: "data-quality.no-domain-attrs", severity: "warning", category: "data-quality",
      title: "No domain attributes on spans",
      description: `${roots.length} HTTP spans lack afenda.* attributes. OTel enrichment plugin may not be registered.`,
      recommendations: ["Verify otelEnrichmentPlugin in index.ts after authPlugin", "Send authenticated request and check trace", "Check startup logs"],
      evidence: { totalSpans: roots.length, orgIdCoverage: 0, principalIdCoverage: 0, correlationIdCoverage: 0 },
    });
  } else {
    const issues: string[] = [];
    if (orgC < 80 && orgC > 0) issues.push(`org.id: ${orgC.toFixed(0)}%`);
    if (prinC < 50 && prinC > 0) issues.push(`principal.id: ${prinC.toFixed(0)}%`);
    if (corrC < 80 && corrC > 0) issues.push(`correlation.id: ${corrC.toFixed(0)}%`);
    if (issues.length > 0) {
      ins.push({
        id: "data-quality.partial-attrs", severity: "info", category: "data-quality",
        title: "Partial domain attribute coverage",
        description: `Gaps: ${issues.join("; ")}. This limits Jaeger search effectiveness.`,
        recommendations: ["Health endpoints naturally lack auth context", "Ensure all authed routes go through auth plugin first", orgC < 50 ? "Low org coverage — org resolution may be failing" : "Reasonable — gaps likely health probes"],
        evidence: { totalSpans: roots.length, orgIdCoverage: Number(orgC.toFixed(1)), principalIdCoverage: Number(prinC.toFixed(1)), correlationIdCoverage: Number(corrC.toFixed(1)) },
      });
    }
  }
  return ins;
}

/* ---------- Factory ---------- */

const ANALYZERS = [
  { name: "slow-operations", fn: slowOps },
  { name: "error-hotspots",  fn: errorHotspots },
  { name: "security",        fn: securitySignals },
  { name: "reliability",     fn: reliability },
  { name: "throughput",      fn: throughput },
  { name: "data-quality",    fn: dataQuality },
] as const;

const SEV_ORDER: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, opportunity: 3 };

export async function GET() {
  try {
    // Fetch traces from Jaeger
    const traceRes = await fetch(
      `${JAEGER_URL}/api/traces?service=afenda-api&limit=200&lookback=1h`,
      { cache: "no-store" },
    );

    if (!traceRes.ok) {
      return NextResponse.json(
        { error: `Jaeger unreachable: ${traceRes.status}` },
        { status: 502 },
      );
    }

    const body = (await traceRes.json()) as JaegerApiResponse;
    const traces: JaegerTrace[] = body.data ?? [];
    const spans = normalise(traces);

    // Run all analyzers
    const insights: Insight[] = [];
    const errors: { analyzer: string; error: string }[] = [];

    for (const { name, fn } of ANALYZERS) {
      try { insights.push(...fn(spans)); }
      catch (e) { errors.push({ analyzer: name, error: e instanceof Error ? e.message : String(e) }); }
    }

    // Sort by severity
    insights.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.title.localeCompare(b.title));

    // Dedup
    const seen = new Set<string>();
    const deduped = insights.filter((i) => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      traceCount: traces.length,
      spanCount: spans.length,
      insights: deduped,
      analyzerErrors: errors,
      jaegerUrl: JAEGER_URL,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Insight generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
