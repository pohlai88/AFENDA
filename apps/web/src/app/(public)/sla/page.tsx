import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Clock, Shield, Zap, Activity, AlertTriangle, Info, Wrench } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@afenda/ui";

export const revalidate = 3600; // hourly ISR for uptime stats

export const metadata: Metadata = {
  title: "Service Level Agreement — AFENDA",
  description:
    "Enterprise SLA guarantees: 99.95% uptime, RTO < 30 min, RPO < 1 min, backed by NexusCanon Infrastructure Fabric.",
  alternates: { canonical: "/sla" },
  openGraph: {
    title: "Service Level Agreement — AFENDA",
    description:
      "Enterprise SLA: 99.95% uptime, RTO < 30 min, RPO < 1 min, 11-nines data durability.",
    type: "website",
    url: "/sla",
  },
};

const slaMetrics = [
  {
    label: "Monthly Uptime",
    value: "99.95%",
    description: "Maximum 21.9 minutes downtime per month",
    icon: CheckCircle,
    color: "text-success",
  },
  {
    label: "Recovery Time (RTO)",
    value: "< 30 min",
    description: "Maximum time to restore service after incident",
    icon: Clock,
    color: "text-info",
  },
  {
    label: "Recovery Point (RPO)",
    value: "< 1 min",
    description: "Maximum data loss window during incident",
    icon: Shield,
    color: "text-success",
  },
  {
    label: "Data Durability",
    value: "11 nines",
    description: "99.999999999% annual durability guarantee",
    icon: Shield,
    color: "text-primary",
  },
];

const componentSLA = [
  {
    component: "API Gateway",
    uptime: "99.99%",
    latency: "< 50ms p95",
    description: "RESTful endpoints, authentication, rate limiting",
  },
  {
    component: "Web Application",
    uptime: "99.95%",
    latency: "< 200ms TTFB",
    description: "Next.js App Router, SSR, edge caching",
  },
  {
    component: "Database (PostgreSQL)",
    uptime: "99.99%",
    latency: "< 10ms p95",
    description: "Multi-AZ primary, read replicas, PITR",
  },
  {
    component: "Worker Queue",
    uptime: "99.95%",
    latency: "< 5s pickup",
    description: "Graphile Worker, LISTEN/NOTIFY job processing",
  },
];

const supportSLA = [
  {
    severity: "Critical (P1)",
    description: "Complete service outage or data loss",
    initialResponse: "15 minutes",
    resolution: "4 hours",
    availability: "24/7",
  },
  {
    severity: "High (P2)",
    description: "Major feature degradation affecting multiple users",
    initialResponse: "1 hour",
    resolution: "8 hours",
    availability: "24/7",
  },
  {
    severity: "Medium (P3)",
    description: "Minor feature issue with workaround available",
    initialResponse: "4 hours",
    resolution: "48 hours",
    availability: "Business hours",
  },
  {
    severity: "Low (P4)",
    description: "General questions, feature requests, documentation",
    initialResponse: "24 hours",
    resolution: "5 business days",
    availability: "Business hours",
  },
];

const maintenanceWindows = [
  {
    type: "Scheduled Maintenance",
    frequency: "Monthly",
    duration: "< 1 hour",
    notice: "7 days advance notice",
    window: "Sundays 02:00-04:00 UTC",
  },
  {
    type: "Emergency Maintenance",
    frequency: "As needed",
    duration: "< 2 hours",
    notice: "Best effort notification",
    window: "Any time (critical security/stability)",
  },
];

export default function SLAPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16">
      <div className="w-full">
        <Card>
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-2xl">Service Level Agreement</CardTitle>
            <CardDescription>
              Enterprise-grade availability, performance, and support commitments.
            </CardDescription>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" aria-hidden="true" /> 99.95% Uptime
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" aria-hidden="true" /> SOC 2 Type II
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3" aria-hidden="true" /> Real-time Monitoring
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-8">
            {/* Core SLA Metrics */}
            <section>
              <h3 className="font-semibold text-sm mb-4">SLA Commitments</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {slaMetrics.length > 0 ? (
                  slaMetrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <Card key={metric.label} className="border-muted">
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <Icon className={`h-5 w-5 ${metric.color}`} aria-hidden="true" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-sm">{metric.label}</CardTitle>
                              <p className="text-2xl font-bold mt-1">{metric.value}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{metric.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="border-muted">
                    <CardContent className="py-8">
                      <div className="text-center text-sm text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p>No data available</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            <Separator />

            {/* Component-Level SLA */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm">Component Availability</h3>
              <div className="grid gap-3">
                {componentSLA.length > 0 ? (
                  componentSLA.map((item) => (
                    <div
                      key={item.component}
                      className="rounded-lg border border-muted p-4 grid gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{item.component}</h4>
                        <div className="flex gap-3 text-xs">
                          <Badge variant="secondary">{item.uptime}</Badge>
                          <Badge variant="outline">{item.latency}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-muted p-4">
                    <div className="text-center text-sm text-muted-foreground">
                      <Info className="h-8 w-8 mx-auto mb-2" />
                      <p>No data available</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Support Response Times */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm">Support Response SLA</h3>
              <p className="text-sm text-muted-foreground">
                Our support team commits to the following response and resolution times based
                on incident severity.
              </p>
              <div className="grid gap-3">
                {supportSLA.length > 0 ? (
                  supportSLA.map((item) => (
                    <div
                      key={item.severity}
                      className="rounded-lg border border-muted p-4 grid gap-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{item.severity}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.availability}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                      <div>
                        <span className="font-semibold">Initial Response:</span>{" "}
                        <span className="text-muted-foreground">{item.initialResponse}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Target Resolution:</span>{" "}
                        <span className="text-muted-foreground">{item.resolution}</span>
                      </div>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="rounded-lg border border-muted p-4">
                    <div className="text-center text-sm text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No data available</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Scheduled Maintenance */}
            <section className="space-y-4">
              <h3 className="font-semibold text-sm">Maintenance Windows</h3>
              <div className="grid gap-3">
                {maintenanceWindows.length > 0 ? (
                  maintenanceWindows.map((item) => (
                    <div
                      key={item.type}
                      className="rounded-lg border border-muted p-4 grid gap-2"
                    >
                      <h4 className="font-semibold text-sm">{item.type}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="font-semibold block text-muted-foreground">
                            Frequency
                          </span>
                          <span>{item.frequency}</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-muted-foreground">
                          Duration
                        </span>
                        <span>{item.duration}</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-muted-foreground">
                          Notice
                        </span>
                        <span>{item.notice}</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-muted-foreground">
                          Window
                        </span>
                        <span>{item.window}</span>
                      </div>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="rounded-lg border border-muted p-4">
                    <div className="text-center text-sm text-muted-foreground">
                      <Wrench className="h-8 w-8 mx-auto mb-2" />
                      <p>No data available</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled maintenance windows are excluded from uptime calculations.
                Emergency maintenance is counted against SLA uptime.
              </p>
            </section>

            <Separator />

            {/* SLA Credits */}
            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">SLA Credits &amp; Refunds</h3>
              <p className="text-muted-foreground">
                If we fail to meet our 99.95% monthly uptime guarantee, you are eligible for
                service credits:
              </p>
              <div className="rounded-lg border border-muted p-4 grid gap-2 text-xs">
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <span className="font-semibold">99.95% - 99.00%</span>
                    <span className="block text-muted-foreground">10% credit</span>
                  </div>
                  <div>
                    <span className="font-semibold">99.00% - 95.00%</span>
                    <span className="block text-muted-foreground">25% credit</span>
                  </div>
                  <div>
                    <span className="font-semibold">&lt; 95.00%</span>
                    <span className="block text-muted-foreground">50% credit</span>
                  </div>
                  <div>
                    <span className="font-semibold">Data Loss Event</span>
                    <span className="block text-muted-foreground">100% credit</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Claims Process:</strong> SLA credit requests must be submitted to{" "}
                <a
                  href="mailto:legal@nexuscanon.com"
                  className="text-primary hover:underline"
                >
                  legal@nexuscanon.com
                </a>{" "}
                within 30 days of the incident. Credits are applied to the following month's
                invoice.
              </p>
            </section>

            <Separator />

            {/* Incident Response */}
            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">Incident Response Procedures</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong>Detection:</strong> 24/7 automated monitoring with real-time alerts
                  via PagerDuty, Datadog, and custom health checks.
                </li>
                <li>
                  <strong>Triage:</strong> On-call engineer assesses severity (P1-P4) and
                  initiates incident response protocol within 5 minutes.
                </li>
                <li>
                  <strong>Communication:</strong> Status page updated immediately. Email
                  notifications sent for P1/P2 incidents within 15 minutes.
                </li>
                <li>
                  <strong>Mitigation:</strong> Engineering team implements fix or failover.
                  All actions logged in audit trail.
                </li>
                <li>
                  <strong>Post-Mortem:</strong> Root cause analysis published within 72 hours
                  for P1/P2 incidents, including timeline, impact, and remediation steps.
                </li>
              </ol>
            </section>

            <Separator />

            {/* Monitoring & Transparency */}
            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">Monitoring &amp; Transparency</h3>
              <p className="text-muted-foreground">
                Real-time service health and historical uptime data:
              </p>
              <div className="rounded-lg border border-muted bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">Real-Time Status Page</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Monitor live service health, incident history, and scheduled maintenance.
                    </p>
                    <Link
                      href="/status"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-2"
                    >
                      <Zap className="h-3 w-3" aria-hidden="true" />
                      View Status Dashboard
                    </Link>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Uptime is measured by automated synthetic checks running every 60 seconds from
                multiple global regions. API availability is calculated as successful requests
                / total requests (excluding scheduled maintenance).
              </p>
            </section>

            <Separator />

            {/* Definitions */}
            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">Definitions</h3>
              <dl className="grid gap-3 text-xs">
                <div className="rounded-lg border border-muted p-3">
                  <dt className="font-semibold">Uptime</dt>
                  <dd className="text-muted-foreground mt-1">
                    Percentage of time the service is available and responsive to API requests
                    within a calendar month, excluding scheduled maintenance windows.
                  </dd>
                </div>
                <div className="rounded-lg border border-muted p-3">
                  <dt className="font-semibold">Downtime</dt>
                  <dd className="text-muted-foreground mt-1">
                    Period when the service returns HTTP 5xx errors for &gt; 5 consecutive
                    minutes, or data plane is inaccessible due to infrastructure failure.
                  </dd>
                </div>
                <div className="rounded-lg border border-muted p-3">
                  <dt className="font-semibold">RTO (Recovery Time Objective)</dt>
                  <dd className="text-muted-foreground mt-1">
                    Maximum acceptable time to restore service functionality after a disaster
                    or major incident. Target: &lt; 30 minutes.
                  </dd>
                </div>
                <div className="rounded-lg border border-muted p-3">
                  <dt className="font-semibold">RPO (Recovery Point Objective)</dt>
                  <dd className="text-muted-foreground mt-1">
                    Maximum acceptable window of data loss measured in time. Target: &lt; 1
                    minute (via hourly snapshots + WAL streaming).
                  </dd>
                </div>
                <div className="rounded-lg border border-muted p-3">
                  <dt className="font-semibold">Data Durability</dt>
                  <dd className="text-muted-foreground mt-1">
                    Probability that data stored in the system will not be lost over a year.
                    11 nines (99.999999999%) means 1 in 100 billion objects may be lost
                    annually.
                  </dd>
                </div>
              </dl>
            </section>

            <Separator />

            {/* Exclusions */}
            <section className="space-y-4 text-sm">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                SLA Exclusions
              </h3>
              <p className="text-muted-foreground">
                The following events are <strong>not</strong> counted against SLA uptime:
              </p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-xs">
                <li>Scheduled maintenance with 7+ days notice</li>
                <li>Issues caused by user misconfiguration or invalid API usage</li>
                <li>Third-party service failures (DNS providers, CDN, OAuth providers)</li>
                <li>DDoS attacks or other malicious traffic (mitigation in progress)</li>
                <li>Force majeure events (natural disasters, war, pandemics)</li>
                <li>Beta features explicitly marked as "experimental" or "preview"</li>
              </ul>
            </section>

            <div className="rounded-lg border border-muted bg-muted/50 p-4 text-center text-sm">
              <p className="text-muted-foreground">
                Questions about our SLA or need to file a claim? Contact{" "}
                <a
                  href="mailto:legal@nexuscanon.com"
                  className="font-medium text-primary hover:underline"
                >
                  legal@nexuscanon.com
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/status"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                View System Status
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
