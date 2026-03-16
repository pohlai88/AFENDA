import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Wrench,
  XCircle,
  Activity,
  TrendingUp,
  Server,
  Database,
  ShieldCheck,
  Workflow,
  Blocks,
  FileSearch,
  Sparkles,
} from "lucide-react";

import { Badge, Button } from "@afenda/ui";
import {
  MarketingInfoShell,
  MarketingInfoHeader,
  MarketingInfoKicker,
  MarketingInfoTitle,
  MarketingInfoDescription,
  MarketingInfoMeta,
  MarketingInfoContent,
  MarketingInfoFooter,
  MarketingInfoCta,
  MarketingInfoCtaTitle,
  MarketingInfoCtaBody,
  MarketingInfoCtaRow,
} from "../_components/marketing-info-shell";
import {
  MarketingInfoSection,
  MarketingInfoSectionHeader,
  MarketingInfoSectionTitle,
  MarketingInfoSectionDescription,
  MarketingInfoCard,
  MarketingInfoCardHeader,
  MarketingInfoCardTitle,
  MarketingInfoCardBody,
  MarketingInfoBadge,
} from "../_components/marketing-info-primitives";
import {
  AnimatedCard,
  AnimatedBadge,
  AnimatedL1,
  AnimatedGrid,
  AnimatedGridItem,
} from "../_components/marketing-info-animated";
import { PremiumDataFlow } from "../_components/premium-illustrations";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "System Status — AFENDA | Business Truth Engine",
  description:
    "Real-time system status for AFENDA platform — transparency into service health, uptime, and operational performance.",
  alternates: { canonical: "/status" },
  openGraph: {
    title: "System Status — AFENDA | Business Truth Engine",
    description: "Real-time platform status and uptime monitoring with full transparency.",
    type: "website",
    url: "/status",
  },
};

const STATUS_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "System Status — AFENDA",
  description:
    "Real-time system status for AFENDA platform — monitor uptime, performance, and service health.",
  url: "https://afenda.com/status",
} as const;

const STATUS_PAGE_JSON_LD_HTML = JSON.stringify(STATUS_PAGE_JSON_LD).replace(/</g, "\\u003c");

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface Service {
  readonly name: string;
  readonly status: ServiceStatus;
  readonly uptime: string;
  readonly responseTime: string;
}

interface Incident {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly description: string;
  readonly startTime: string;
  readonly endTime: string | null;
}

interface SystemStatus {
  readonly overallStatus: ServiceStatus;
  readonly services: readonly Service[];
  readonly incidents: readonly Incident[];
}

function ServiceGlyph({ serviceName }: { serviceName: string }) {
  if (serviceName.includes("API")) {
    return <Server className="h-4 w-4" aria-hidden />;
  }
  if (serviceName.includes("Database")) {
    return <Database className="h-4 w-4" aria-hidden />;
  }
  if (serviceName.includes("Authentication")) {
    return <ShieldCheck className="h-4 w-4" aria-hidden />;
  }
  if (serviceName.includes("Workflow")) {
    return <Workflow className="h-4 w-4" aria-hidden />;
  }
  if (serviceName.includes("Module")) {
    return <Blocks className="h-4 w-4" aria-hidden />;
  }
  return <FileSearch className="h-4 w-4" aria-hidden />;
}

async function getSystemStatus(): Promise<SystemStatus> {
  return {
    overallStatus: "operational",
    services: [
      {
        name: "API Gateway",
        status: "operational",
        uptime: "99.98%",
        responseTime: "45ms",
      },
      {
        name: "Database (NexusCanon)",
        status: "operational",
        uptime: "99.99%",
        responseTime: "12ms",
      },
      {
        name: "Authentication Service",
        status: "operational",
        uptime: "99.97%",
        responseTime: "38ms",
      },
      {
        name: "Workflow Engine",
        status: "operational",
        uptime: "99.95%",
        responseTime: "156ms",
      },
      {
        name: "Module Orchestration",
        status: "operational",
        uptime: "99.96%",
        responseTime: "89ms",
      },
      {
        name: "Audit Logging",
        status: "operational",
        uptime: "99.99%",
        responseTime: "23ms",
      },
    ],
    incidents: [
      {
        id: "inc-001",
        title: "Scheduled Maintenance — Database Upgrade",
        status: "resolved",
        description: "Planned database upgrade to improve performance and add new features.",
        startTime: "2026-02-01T02:00:00Z",
        endTime: "2026-02-01T04:30:00Z",
      },
    ],
  };
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "operational":
      return <CheckCircle className="h-5 w-5 text-success" aria-hidden />;
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />;
    case "outage":
      return <XCircle className="h-5 w-5 text-destructive" aria-hidden />;
    case "maintenance":
      return <Wrench className="h-5 w-5 text-info" aria-hidden />;
  }
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "operational":
      return <Badge className="bg-success">Operational</Badge>;
    case "degraded":
      return <Badge variant="secondary">Degraded Performance</Badge>;
    case "outage":
      return <Badge variant="destructive">Service Outage</Badge>;
    case "maintenance":
      return <Badge variant="outline">Scheduled Maintenance</Badge>;
  }
}

function formatIncidentDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function SimulatedDataBanner() {
  return (
    <AnimatedCard tone="raised" className="border-interactive/30">
      <MarketingInfoCardHeader>
        <span className="mi-card-kicker mi-card-kicker--interactive">
          <Activity className="mr-1.5 inline-block h-4 w-4 align-text-bottom" aria-hidden />
          Development Preview
        </span>
        <MarketingInfoCardTitle>Simulated Service Data</MarketingInfoCardTitle>
      </MarketingInfoCardHeader>
      <MarketingInfoCardBody>
        <p className="mi-card-copy">
          This status page displays simulated health metrics. Production will integrate real-time
          monitoring infrastructure. See our{" "}
          <Link href="/sla" className="text-primary hover:underline">
            Service Level Agreement
          </Link>{" "}
          for uptime commitments.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Premium status surface (preview)
        </div>
      </MarketingInfoCardBody>
    </AnimatedCard>
  );
}

function ServiceHealthSection({ services }: { services: readonly Service[] }) {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Service health monitor</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          Real-time status of all platform services, updated every 60 seconds.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedGrid columns={2}>
          {services.map((service) => (
            <AnimatedGridItem key={service.name}>
              <AnimatedCard tone="muted">
                <MarketingInfoCardHeader>
                  <span className="mi-card-kicker mi-card-kicker--primary inline-flex items-center gap-1.5">
                    <ServiceGlyph serviceName={service.name} />
                    Live Service
                  </span>
                  <div className="flex w-full items-center justify-between gap-2">
                    <MarketingInfoCardTitle>{service.name}</MarketingInfoCardTitle>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={service.status} />
                      <StatusBadge status={service.status} />
                    </div>
                  </div>
                </MarketingInfoCardHeader>
                <MarketingInfoCardBody>
                  <ul className="mi-card-list">
                    <li>
                      <strong>Uptime (30d):</strong> {service.uptime}
                    </li>
                    <li>
                      <strong>Avg Response:</strong> {service.responseTime}
                    </li>
                  </ul>
                </MarketingInfoCardBody>
              </AnimatedCard>
            </AnimatedGridItem>
          ))}
        </AnimatedGrid>
      </AnimatedL1>
    </MarketingInfoSection>
  );
}

function RecentIncidentsSection({ incidents }: { incidents: readonly Incident[] }) {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Recent Incidents</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          Past 30 days of incidents and maintenance windows
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>
      {incidents.length === 0 ? (
        <AnimatedCard>
          <MarketingInfoCardHeader>
            <MarketingInfoCardTitle>No incidents reported</MarketingInfoCardTitle>
          </MarketingInfoCardHeader>
          <MarketingInfoCardBody>
            <p className="mi-card-copy">
              All systems have been operational. No incidents in the past 30 days.
            </p>
          </MarketingInfoCardBody>
        </AnimatedCard>
      ) : (
        <AnimatedL1>
          <AnimatedGrid columns={1}>
            {incidents.map((incident) => (
              <AnimatedGridItem key={incident.id}>
                <AnimatedCard>
                  <MarketingInfoCardHeader>
                    <MarketingInfoCardTitle>{incident.title}</MarketingInfoCardTitle>
                    <div className="mi-card-meta">
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                  </MarketingInfoCardHeader>
                  <MarketingInfoCardBody>
                    <p className="mi-card-copy">{incident.description}</p>
                    <p className="mi-card-meta mi-card-meta--ref">
                      Started: {formatIncidentDate(incident.startTime)}
                      {incident.endTime != null &&
                        ` · Resolved: ${formatIncidentDate(incident.endTime)}`}
                    </p>
                  </MarketingInfoCardBody>
                </AnimatedCard>
              </AnimatedGridItem>
            ))}
          </AnimatedGrid>
        </AnimatedL1>
      )}
    </MarketingInfoSection>
  );
}

const UPTIME_METRICS = [
  { label: "Overall Uptime", value: "99.97%" },
  { label: "Avg Response Time", value: "42ms" },
  { label: "Active Incidents", value: "0" },
] as const;

function UptimeMetricsSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Uptime Metrics</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>30-day rolling average</MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>
      <AnimatedGrid columns={3}>
        {UPTIME_METRICS.map((metric) => (
          <AnimatedGridItem key={metric.label}>
            <AnimatedCard tone="muted">
              <MarketingInfoCardHeader>
                <span className="mi-card-kicker mi-card-kicker--premium inline-flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  KPI
                </span>
                <MarketingInfoCardTitle>{metric.label}</MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-metric-value">{metric.value}</p>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>
        ))}
      </AnimatedGrid>
    </MarketingInfoSection>
  );
}

export default async function StatusPage() {
  const status = await getSystemStatus();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: STATUS_PAGE_JSON_LD_HTML }}
      />
      <MarketingInfoShell>
        <MarketingInfoHeader>
          <MarketingInfoKicker>
            <span className="inline-flex items-center gap-2">
              <PremiumDataFlow size={16} />
              Platform Transparency
            </span>
          </MarketingInfoKicker>
          <MarketingInfoTitle>System Status</MarketingInfoTitle>
          <MarketingInfoDescription>
            Real-time monitoring of AFENDA platform services. All systems operational and updated
            every 60 seconds.
          </MarketingInfoDescription>
          <MarketingInfoMeta>
            <AnimatedBadge tone="primary">
              <StatusIcon status={status.overallStatus} />
              <span className="ml-1.5">All Systems Operational</span>
            </AnimatedBadge>
            <AnimatedBadge tone="premium">
              <RefreshCw className="mr-1.5 inline h-3 w-3" aria-hidden />
              Auto-refresh 60s
            </AnimatedBadge>
          </MarketingInfoMeta>
        </MarketingInfoHeader>

        <MarketingInfoContent>
          <SimulatedDataBanner />

          <hr className="mi-separator" />

          <ServiceHealthSection services={status.services} />

          <hr className="mi-separator" />

          <UptimeMetricsSection />

          <hr className="mi-separator" />

          <RecentIncidentsSection incidents={status.incidents} />
        </MarketingInfoContent>

        <MarketingInfoFooter>
          <MarketingInfoCta>
            <MarketingInfoCtaTitle>Service level commitments</MarketingInfoCtaTitle>
            <MarketingInfoCtaBody>
              Review our uptime guarantees, support response times, and service level agreements for
              enterprise deployments.
            </MarketingInfoCtaBody>
            <MarketingInfoCtaRow>
              <Button asChild>
                <Link href="/sla">View SLA</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Contact Support</Link>
              </Button>
            </MarketingInfoCtaRow>
          </MarketingInfoCta>
        </MarketingInfoFooter>
      </MarketingInfoShell>
    </>
  );
}
