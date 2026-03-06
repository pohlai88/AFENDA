/**
 * OTel Insight Factory — pluggable analyzers that read Jaeger trace data
 * and produce typed, actionable recommendations.
 *
 * Architecture:
 *   1. JaegerClient fetches recent traces from the Jaeger Query API.
 *   2. Each Analyzer receives normalised spans and emits Insight[]
 *   3. Insights are severity-ranked, deduplicated, and returned.
 *
 * Adding a new analyzer:
 *   - Write a function matching the `Analyzer` type
 *   - Register it in `ANALYZERS` array
 *   - It auto-runs on every insight request
 *
 * Zero OTel SDK dependency — this reads FROM Jaeger, not into it.
 */

// ── Jaeger API types ─────────────────────────────────────────────────────────

export interface JaegerTag {
  key: string;
  type: string;
  value: string | number | boolean;
}

export interface JaegerLog {
  timestamp: number;
  fields: JaegerTag[];
}

export interface JaegerReference {
  refType: "CHILD_OF" | "FOLLOWS_FROM";
  traceID: string;
  spanID: string;
}

export interface JaegerSpan {
  traceID: string;
  spanID: string;
  operationName: string;
  references: JaegerReference[];
  startTime: number; // microseconds
  duration: number; // microseconds
  tags: JaegerTag[];
  logs: JaegerLog[];
  processID: string;
  warnings: string[] | null;
}

export interface JaegerProcess {
  serviceName: string;
  tags: JaegerTag[];
}

export interface JaegerTrace {
  traceID: string;
  spans: JaegerSpan[];
  processes: Record<string, JaegerProcess>;
  warnings: string[] | null;
}

export interface JaegerApiResponse<T> {
  data: T;
  total: number;
  limit: number;
  offset: number;
  errors: string[] | null;
}

// ── Insight types ────────────────────────────────────────────────────────────

export type InsightSeverity = "critical" | "warning" | "info" | "opportunity";

export type InsightCategory =
  | "latency"
  | "errors"
  | "security"
  | "reliability"
  | "throughput"
  | "data-quality";

export interface Insight {
  /** Stable ID for dedup (e.g. "latency.slow-operation.ap.submit_invoice") */
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  /** Short headline (1 line) */
  title: string;
  /** Actionable description with context */
  description: string;
  /** Concrete steps to take */
  recommendations: string[];
  /** Supporting data */
  evidence: Record<string, string | number>;
  /** Jaeger deep-link for investigation */
  jaegerUrl?: string;
}

// ── Normalised span (flat, easy to query) ────────────────────────────────────

export interface NormalisedSpan {
  traceID: string;
  spanID: string;
  parentSpanID: string | null;
  operationName: string;
  serviceName: string;
  startTime: number; // microseconds
  durationMs: number; // milliseconds
  tags: Map<string, string | number | boolean>;
  logs: JaegerLog[];
  isRoot: boolean;
  isError: boolean;
  httpMethod: string | null;
  httpTarget: string | null;
  httpStatusCode: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tag(tags: JaegerTag[], key: string): string | number | boolean | undefined {
  return tags.find((t) => t.key === key)?.value;
}

function normalise(traces: JaegerTrace[]): NormalisedSpan[] {
  const spans: NormalisedSpan[] = [];

  for (const trace of traces) {
    for (const span of trace.spans) {
      const tagMap = new Map<string, string | number | boolean>();
      for (const t of span.tags) tagMap.set(t.key, t.value);

      const parentRef = span.references.find((r) => r.refType === "CHILD_OF");
      const statusCode = tag(span.tags, "http.status_code");

      spans.push({
        traceID: span.traceID,
        spanID: span.spanID,
        parentSpanID: parentRef?.spanID ?? null,
        operationName: span.operationName,
        serviceName: trace.processes[span.processID]?.serviceName ?? "unknown",
        startTime: span.startTime,
        durationMs: span.duration / 1000,
        tags: tagMap,
        logs: span.logs ?? [],
        isRoot: !parentRef,
        isError: tagMap.get("error") === true || (typeof statusCode === "number" && statusCode >= 500),
        httpMethod: (tag(span.tags, "http.method") as string) ?? null,
        httpTarget: (tag(span.tags, "http.target") as string) ?? null,
        httpStatusCode: typeof statusCode === "number" ? statusCode : null,
      });
    }
  }

  return spans;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * (p / 100)) - 1;
  return sorted[Math.max(0, idx)]!;
}

function median(values: number[]): number {
  return percentile(values, 50);
}

// ── Analyzer type ────────────────────────────────────────────────────────────

type Analyzer = (spans: NormalisedSpan[], config: InsightConfig) => Insight[];

// ── Configuration ────────────────────────────────────────────────────────────

export interface InsightConfig {
  jaegerUrl: string;
  /** Threshold for "slow" operations in ms */
  slowThresholdMs: number;
  /** Error rate above this % is a warning */
  errorRateWarning: number;
  /** Error rate above this % is critical */
  errorRateCritical: number;
  /** Min sample count to generate statistical insights */
  minSampleCount: number;
}

const DEFAULT_CONFIG: InsightConfig = {
  jaegerUrl: "http://localhost:16686",
  slowThresholdMs: 500,
  errorRateWarning: 5,
  errorRateCritical: 20,
  minSampleCount: 3,
};

// ── Analyzers ────────────────────────────────────────────────────────────────

/**
 * A1: Slow Operations — finds operations whose P95 latency exceeds threshold
 * or whose latest call is >3× the median (regression).
 */
function analyzeSlowOperations(spans: NormalisedSpan[], config: InsightConfig): Insight[] {
  const insights: Insight[] = [];
  const byOp = groupBy(spans, (s) => s.operationName);

  for (const [op, opSpans] of byOp) {
    if (opSpans.length < config.minSampleCount) continue;

    const durations = opSpans.map((s) => s.durationMs);
    const p50 = median(durations);
    const p95 = percentile(durations, 95);
    const max = Math.max(...durations);

    if (p95 > config.slowThresholdMs) {
      insights.push({
        id: `latency.slow-p95.${op}`,
        severity: p95 > config.slowThresholdMs * 3 ? "critical" : "warning",
        category: "latency",
        title: `Slow operation: ${op}`,
        description: `P95 latency is ${p95.toFixed(0)}ms (threshold: ${config.slowThresholdMs}ms). Median is ${p50.toFixed(0)}ms across ${opSpans.length} calls.`,
        recommendations: [
          `Investigate the slowest trace in Jaeger to find the bottleneck span`,
          `Check if DB queries under this operation have missing indexes`,
          p95 > 1000 ? `Consider adding a database query cache or materialized view` : `Profile the hot path for unnecessary allocations`,
        ],
        evidence: {
          operation: op,
          sampleCount: opSpans.length,
          p50Ms: Math.round(p50),
          p95Ms: Math.round(p95),
          maxMs: Math.round(max),
        },
        jaegerUrl: `${config.jaegerUrl}/search?service=afenda-api&operation=${encodeURIComponent(op)}&minDuration=${Math.round(p95 * 1000)}us`,
      });
    }

    // Regression detection: latest 20% of calls vs historical median
    const sorted = [...opSpans].sort((a, b) => a.startTime - b.startTime);
    const recentCount = Math.max(1, Math.floor(sorted.length * 0.2));
    const recent = sorted.slice(-recentCount);
    const recentMedian = median(recent.map((s) => s.durationMs));

    if (recentMedian > p50 * 3 && recentMedian > 100 && opSpans.length >= config.minSampleCount * 2) {
      insights.push({
        id: `latency.regression.${op}`,
        severity: "warning",
        category: "latency",
        title: `Latency regression: ${op}`,
        description: `Recent calls average ${recentMedian.toFixed(0)}ms vs historical median ${p50.toFixed(0)}ms (${(recentMedian / p50).toFixed(1)}× slower). Possible regression.`,
        recommendations: [
          `Compare a recent slow trace with an older fast trace using Jaeger's compare view`,
          `Check if a recent deployment changed query patterns or added middleware`,
          `Look for increased DB row counts or missing index on a growing table`,
        ],
        evidence: {
          operation: op,
          historicalMedianMs: Math.round(p50),
          recentMedianMs: Math.round(recentMedian),
          ratio: Number((recentMedian / p50).toFixed(1)),
          recentSampleCount: recentCount,
        },
      });
    }
  }

  return insights;
}

/**
 * A2: Error Hotspots — finds operations with high error rates, broken down
 * by HTTP status code and domain error code.
 */
function analyzeErrorHotspots(spans: NormalisedSpan[], config: InsightConfig): Insight[] {
  const insights: Insight[] = [];
  const httpSpans = spans.filter((s) => s.httpTarget !== null);
  const byRoute = groupBy(httpSpans, (s) => `${s.httpMethod} ${s.httpTarget}`);

  for (const [route, routeSpans] of byRoute) {
    if (routeSpans.length < config.minSampleCount) continue;

    const errors = routeSpans.filter((s) => s.httpStatusCode !== null && s.httpStatusCode >= 400);
    const errorRate = (errors.length / routeSpans.length) * 100;

    if (errorRate < config.errorRateWarning) continue;

    // Break down by status code
    const byStatus = groupBy(errors, (s) => String(s.httpStatusCode));
    const statusBreakdown = [...byStatus.entries()]
      .map(([code, spans]) => `${code}: ${spans.length}`)
      .join(", ");

    // Look for domain error codes in child spans
    const domainErrors = new Set<string>();
    for (const s of errors) {
      const code = s.tags.get("afenda.error.code");
      if (typeof code === "string") domainErrors.add(code);
    }

    const severity = errorRate >= config.errorRateCritical ? "critical" : "warning";

    insights.push({
      id: `errors.hotspot.${route.replace(/\s+/g, "-").replace(/[/:]/g, "_")}`,
      severity,
      category: "errors",
      title: `High error rate: ${route}`,
      description: `${errorRate.toFixed(0)}% of requests to ${route} are failing (${errors.length}/${routeSpans.length}). Status breakdown: ${statusBreakdown}.${domainErrors.size > 0 ? ` Domain errors: ${[...domainErrors].join(", ")}.` : ""}`,
      recommendations: [
        errors.some((s) => s.httpStatusCode === 500) ? `Investigate 500 errors immediately — these indicate unhandled exceptions` : `Review 4xx responses — likely validation or auth issues`,
        domainErrors.size > 0 ? `Check domain logic for: ${[...domainErrors].join(", ")}` : `Add domain error codes to identify root cause categories`,
        errorRate > 50 ? `Error rate above 50% — this endpoint may be broken or misconfigured` : `Monitor trend — is this rate increasing?`,
      ],
      evidence: {
        route,
        totalRequests: routeSpans.length,
        errorCount: errors.length,
        errorRate: Number(errorRate.toFixed(1)),
        statusBreakdown,
        domainErrors: [...domainErrors].join(", ") || "none",
      },
      jaegerUrl: `${config.jaegerUrl}/search?service=afenda-api&tags=${encodeURIComponent(JSON.stringify({ "http.status_code": 500 }))}`,
    });
  }

  return insights;
}

/**
 * A3: Security Signals — SoD violations, permission denials, auth failures.
 */
function analyzeSecuritySignals(spans: NormalisedSpan[], config: InsightConfig): Insight[] {
  const insights: Insight[] = [];

  // Collect domain error codes that indicate security issues
  const securityCodes = new Map<string, NormalisedSpan[]>();
  const SECURITY_PATTERNS = [
    "IAM_INSUFFICIENT_PERMISSIONS",
    "SHARED_FORBIDDEN",
    "SHARED_SOD_VIOLATION",
  ];

  for (const s of spans) {
    const code = s.tags.get("afenda.error.code");
    if (typeof code === "string" && SECURITY_PATTERNS.some((p) => (code as string).includes(p))) {
      if (!securityCodes.has(code as string)) securityCodes.set(code as string, []);
      securityCodes.get(code as string)!.push(s);
    }
  }

  // Also check for 403s at HTTP level
  const forbidden = spans.filter((s) => s.httpStatusCode === 403);
  if (forbidden.length > 0) {
    // Group by principal
    const byPrincipal = groupBy(forbidden, (s) => {
      const pid = s.tags.get("afenda.principal.id");
      return typeof pid === "string" ? (pid as string) : "anonymous";
    });

    for (const [principal, principalSpans] of byPrincipal) {
      if (principalSpans.length < 2) continue; // single 403 is normal

      const routes = [...new Set(principalSpans.map((s) => s.httpTarget).filter(Boolean))];

      insights.push({
        id: `security.repeated-403.${principal.slice(0, 8)}`,
        severity: principalSpans.length >= 5 ? "critical" : "warning",
        category: "security",
        title: `Repeated access denials: ${principal === "anonymous" ? "unauthenticated user" : principal.slice(0, 8) + "…"}`,
        description: `${principalSpans.length} forbidden (403) responses for ${principal === "anonymous" ? "unauthenticated requests" : `principal ${principal.slice(0, 8)}…`}. Targeted routes: ${routes.join(", ")}.`,
        recommendations: [
          principalSpans.length >= 10 ? `Possible brute force or privilege escalation attempt — review audit logs` : `Check if this user needs additional role assignments`,
          `Verify RBAC configuration for the targeted routes`,
          `Consider rate-limiting 403 responses to slow enumeration attacks`,
        ],
        evidence: {
          principal: principal === "anonymous" ? "unauthenticated" : principal,
          denialCount: principalSpans.length,
          routes: routes.join(", "),
        },
      });
    }
  }

  // SoD-specific violations
  for (const [code, codeSpans] of securityCodes) {
    insights.push({
      id: `security.sod-violation.${code.toLowerCase()}`,
      severity: codeSpans.length >= 3 ? "critical" : "warning",
      category: "security",
      title: `SoD/Permission violations: ${code}`,
      description: `${codeSpans.length} attempts blocked by ${code}. This may indicate misconfigured roles or users testing boundaries.`,
      recommendations: [
        `Review whether the affected users should have the required permissions`,
        `Check org RBAC assignments — a role may be missing a permission`,
        `If legitimate, update the role to grant access. If not, flag for security review.`,
      ],
      evidence: {
        errorCode: code,
        occurrences: codeSpans.length,
        uniqueTraces: new Set(codeSpans.map((s) => s.traceID)).size,
      },
    });
  }

  return insights;
}

/**
 * A4: Reliability Patterns — retry storms, timeout cascades, missing spans.
 */
function analyzeReliability(spans: NormalisedSpan[], config: InsightConfig): Insight[] {
  const insights: Insight[] = [];

  // Detect idempotency replays (same idempotency key appearing multiple times)
  const byIdemKey = new Map<string, NormalisedSpan[]>();
  for (const s of spans) {
    const key = s.tags.get("afenda.idempotency.key");
    if (typeof key === "string") {
      if (!byIdemKey.has(key as string)) byIdemKey.set(key as string, []);
      byIdemKey.get(key as string)!.push(s);
    }
  }

  const replayedKeys = [...byIdemKey.entries()].filter(([, spans]) => spans.length > 1);
  if (replayedKeys.length > 0) {
    const totalReplays = replayedKeys.reduce((sum, [, spans]) => sum + spans.length - 1, 0);

    insights.push({
      id: "reliability.idempotency-replays",
      severity: totalReplays >= 10 ? "warning" : "info",
      category: "reliability",
      title: `Idempotency replays detected`,
      description: `${replayedKeys.length} idempotency keys were replayed ${totalReplays} times. This could indicate client retry storms or network instability.`,
      recommendations: [
        `Check if client-side retry logic is too aggressive`,
        totalReplays >= 10 ? `Investigate network layer — frequent replays suggest connection drops` : `Low replay count is normal — likely user double-clicks`,
        `Verify idempotency responses are returning cached results correctly`,
      ],
      evidence: {
        uniqueKeysReplayed: replayedKeys.length,
        totalReplayCount: totalReplays,
        maxReplaysForSingleKey: Math.max(...replayedKeys.map(([, s]) => s.length)),
      },
    });
  }

  // Detect fan-out: single root span with too many children
  const byTrace = groupBy(spans, (s) => s.traceID);
  for (const [traceID, traceSpans] of byTrace) {
    if (traceSpans.length >= 20) {
      const root = traceSpans.find((s) => s.isRoot);
      insights.push({
        id: `reliability.high-fanout.${traceID.slice(0, 8)}`,
        severity: traceSpans.length >= 50 ? "warning" : "info",
        category: "reliability",
        title: `High span fan-out in trace`,
        description: `Trace ${traceID.slice(0, 16)}… has ${traceSpans.length} spans${root ? ` (root: ${root.httpMethod} ${root.httpTarget})` : ""}. May indicate N+1 queries or excessive middleware.`,
        recommendations: [
          `Check for N+1 database query patterns — batch or join instead of looping`,
          `Review middleware chain — are hooks running redundantly?`,
          `Open the trace in Jaeger to see the span tree`,
        ],
        evidence: {
          traceID,
          spanCount: traceSpans.length,
          rootOperation: root ? `${root.httpMethod} ${root.httpTarget}` : "unknown",
          totalDurationMs: root ? Math.round(root.durationMs) : 0,
        },
        jaegerUrl: `${config.jaegerUrl}/trace/${traceID}`,
      });
    }
  }

  return insights;
}

/**
 * A5: Throughput & Capacity — identifies hot operations, traffic distribution.
 */
function analyzeThroughput(spans: NormalisedSpan[], config: InsightConfig): Insight[] {
  const insights: Insight[] = [];
  const httpSpans = spans.filter((s) => s.httpTarget !== null && s.isRoot);

  if (httpSpans.length < config.minSampleCount) return insights;

  const byRoute = groupBy(httpSpans, (s) => `${s.httpMethod} ${s.httpTarget}`);
  const routeCounts = [...byRoute.entries()]
    .map(([route, spans]) => ({ route, count: spans.length }))
    .sort((a, b) => b.count - a.count);

  // Report traffic distribution
  const totalRequests = httpSpans.length;
  const topRoutes = routeCounts.slice(0, 5);
  const topRoutePct = topRoutes.reduce((sum, r) => sum + r.count, 0) / totalRequests * 100;

  if (topRoutes.length > 0) {
    insights.push({
      id: "throughput.traffic-distribution",
      severity: "info",
      category: "throughput",
      title: `Traffic distribution across ${routeCounts.length} endpoints`,
      description: `Top ${topRoutes.length} routes account for ${topRoutePct.toFixed(0)}% of traffic. Hottest: ${topRoutes[0]!.route} (${topRoutes[0]!.count} calls, ${((topRoutes[0]!.count / totalRequests) * 100).toFixed(0)}%).`,
      recommendations: [
        `Ensure the hottest endpoint (${topRoutes[0]!.route}) has adequate caching and connection pooling`,
        topRoutePct > 80 ? `Traffic is concentrated — consider load shedding or circuit breaking for the top route` : `Traffic is well-distributed across endpoints`,
        `Monitor this pattern over time to detect sudden shifts`,
      ],
      evidence: {
        totalRequests,
        endpointCount: routeCounts.length,
        topRoute: topRoutes[0]!.route,
        topRouteCount: topRoutes[0]!.count,
        topRoutePercent: Number(((topRoutes[0]!.count / totalRequests) * 100).toFixed(1)),
      },
    });
  }

  return insights;
}

/**
 * A6: Data Quality — missing attributes, uncorrelated spans, unnamed operations.
 */
function analyzeDataQuality(spans: NormalisedSpan[], config: InsightConfig): Insight[] {
  const insights: Insight[] = [];
  const httpRoots = spans.filter((s) => s.isRoot && s.httpTarget !== null);

  if (httpRoots.length < config.minSampleCount) return insights;

  // Check how many root spans have our domain attributes
  const withOrgId = httpRoots.filter((s) => s.tags.has("afenda.org.id")).length;
  const withPrincipal = httpRoots.filter((s) => s.tags.has("afenda.principal.id")).length;
  const withCorrelation = httpRoots.filter((s) => s.tags.has("afenda.correlation.id")).length;

  const orgCoverage = (withOrgId / httpRoots.length) * 100;
  const principalCoverage = (withPrincipal / httpRoots.length) * 100;
  const correlationCoverage = (withCorrelation / httpRoots.length) * 100;

  // Only report if coverage is partial — full coverage is ideal, zero means OTel enrichment isn't wired
  const issues: string[] = [];
  if (orgCoverage < 80 && orgCoverage > 0)
    issues.push(`org.id present on ${orgCoverage.toFixed(0)}% of spans`);
  if (principalCoverage < 50 && principalCoverage > 0)
    issues.push(`principal.id present on ${principalCoverage.toFixed(0)}% of spans`);
  if (correlationCoverage < 80 && correlationCoverage > 0)
    issues.push(`correlation.id present on ${correlationCoverage.toFixed(0)}% of spans`);

  if (orgCoverage === 0 && principalCoverage === 0 && correlationCoverage === 0) {
    insights.push({
      id: "data-quality.no-domain-attrs",
      severity: "warning",
      category: "data-quality",
      title: `No domain attributes on spans`,
      description: `None of the ${httpRoots.length} HTTP spans have afenda.* attributes. The OTel enrichment plugin may not be registered or auth context is not being set on requests.`,
      recommendations: [
        `Verify otelEnrichmentPlugin is registered in apps/api/src/index.ts after authPlugin`,
        `Send an authenticated request and check if the trace has afenda.org.id`,
        `Check api startup logs for "OTel request enrichment plugin registered"`,
      ],
      evidence: {
        totalSpans: httpRoots.length,
        orgIdCoverage: 0,
        principalIdCoverage: 0,
        correlationIdCoverage: 0,
      },
    });
  } else if (issues.length > 0) {
    insights.push({
      id: "data-quality.partial-attrs",
      severity: "info",
      category: "data-quality",
      title: `Partial domain attribute coverage`,
      description: `Some spans are missing domain attributes: ${issues.join("; ")}. This limits Jaeger search/filtering effectiveness.`,
      recommendations: [
        `Health/infra endpoints (/healthz, /readyz) naturally lack auth context — exclude them from this metric`,
        `Ensure all authenticated routes flow through the auth plugin before the OTel plugin`,
        orgCoverage < 50 ? `Low org.id coverage suggests org resolution is failing for some requests` : `Coverage is reasonable — remaining gaps are likely health probes`,
      ],
      evidence: {
        totalSpans: httpRoots.length,
        orgIdCoverage: Number(orgCoverage.toFixed(1)),
        principalIdCoverage: Number(principalCoverage.toFixed(1)),
        correlationIdCoverage: Number(correlationCoverage.toFixed(1)),
      },
    });
  }

  return insights;
}

// ── Analyzer registry ────────────────────────────────────────────────────────

const ANALYZERS: { name: string; fn: Analyzer }[] = [
  { name: "slow-operations",   fn: analyzeSlowOperations },
  { name: "error-hotspots",    fn: analyzeErrorHotspots },
  { name: "security-signals",  fn: analyzeSecuritySignals },
  { name: "reliability",       fn: analyzeReliability },
  { name: "throughput",        fn: analyzeThroughput },
  { name: "data-quality",      fn: analyzeDataQuality },
];

// ── Jaeger client ────────────────────────────────────────────────────────────

async function fetchTraces(jaegerUrl: string, limit: number): Promise<JaegerTrace[]> {
  const url = `${jaegerUrl}/api/traces?service=afenda-api&limit=${limit}&lookback=1h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jaeger API error: ${res.status} ${res.statusText}`);
  const body = (await res.json()) as JaegerApiResponse<JaegerTrace[]>;
  return body.data ?? [];
}

// ── Factory entry point ──────────────────────────────────────────────────────

export interface InsightReport {
  generatedAt: string;
  traceCount: number;
  spanCount: number;
  insights: Insight[];
  analyzerErrors: { analyzer: string; error: string }[];
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  opportunity: 3,
};

/**
 * Run all analyzers against recent Jaeger traces and return a ranked
 * insight report.
 */
export async function generateInsights(
  configOverrides?: Partial<InsightConfig>,
): Promise<InsightReport> {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };

  const traces = await fetchTraces(config.jaegerUrl, 200);
  const spans = normalise(traces);

  const insights: Insight[] = [];
  const analyzerErrors: { analyzer: string; error: string }[] = [];

  for (const { name, fn } of ANALYZERS) {
    try {
      const result = fn(spans, config);
      insights.push(...result);
    } catch (err) {
      analyzerErrors.push({
        analyzer: name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Sort by severity, then alphabetically
  insights.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.title.localeCompare(b.title);
  });

  // Dedup by ID (first occurrence wins)
  const seen = new Set<string>();
  const deduped = insights.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return {
    generatedAt: new Date().toISOString(),
    traceCount: traces.length,
    spanCount: spans.length,
    insights: deduped,
    analyzerErrors,
  };
}

// ── Utility ──────────────────────────────────────────────────────────────────

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}
