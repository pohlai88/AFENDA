import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle,
  Clock,
  Shield,
  Activity,
  Database,
  Server,
  Wrench,
  AlertTriangle,
  Scale,
  FileText,
} from "lucide-react";

import { Button } from "@afenda/ui";
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
  MarketingInfoCardHeader,
  MarketingInfoCardTitle,
  MarketingInfoCardBody,
} from "../_components/marketing-info-primitives";
import {
  AnimatedFadeIn,
  AnimatedL1,
  AnimatedGrid,
  AnimatedGridItem,
  AnimatedCard,
  AnimatedBadge,
} from "../_components/marketing-info-animated";

export const dynamic = "force-static";

type CardTone = "default" | "muted" | "raised" | "premium";
type Lane = "brand" | "operator" | "institutional";
type BadgeTone = "primary" | "premium";

interface HighlightCard {
  readonly title: string;
  readonly body: string;
  readonly icon: LucideIcon;
  readonly badge: string;
  readonly tone: CardTone;
}

interface PolicyCard {
  readonly title: string;
  readonly body: string;
  readonly icon: LucideIcon;
  readonly badge?: string;
  readonly tone?: CardTone;
}

interface PolicyCluster {
  readonly title: string;
  readonly description: string;
  readonly lane: Lane;
  readonly columns?: 1 | 2 | 3;
  readonly cards: readonly PolicyCard[];
}

export const metadata: Metadata = {
  title: "Service Level Agreement — AFENDA | Business Truth Engine",
  description:
    "Enterprise SLA with 99.95% uptime, RTO < 30min, RPO < 1min, support response targets, and defined service credits.",
  alternates: { canonical: "/sla" },
  openGraph: {
    title: "Service Level Agreement — AFENDA",
    description:
      "Enterprise SLA: uptime, recovery objectives, support response, and service credits.",
    type: "website",
    url: "/sla",
  },
};

const SLA_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Service Level Agreement — AFENDA",
  description:
    "Enterprise SLA commitments for availability, recovery, support response, and operational transparency.",
  url: "https://afenda.com/sla",
} as const;

const SLA_PAGE_JSON_LD_HTML = JSON.stringify(SLA_PAGE_JSON_LD).replace(/</g, "\\u003c");

const HIGHLIGHT_CARDS = [
  {
    title: "99.95% Uptime Commitment",
    body: "Multi-AZ architecture with automated failover supports governed enterprise operations with maximum 4.38 hours annual planned downtime.",
    icon: CheckCircle,
    badge: "99.95%",
    tone: "premium",
  },
  {
    title: "Recovery Time Objective",
    body: "Incident response with RTO < 30 minutes for critical platform functions and automated health checks every 60 seconds.",
    icon: Clock,
    badge: "RTO < 30m",
    tone: "raised",
  },
  {
    title: "Recovery Point Objective",
    body: "Continuous replication with RPO < 1 minute ensures minimal data loss with hourly snapshots and 30-day point-in-time recovery.",
    icon: Database,
    badge: "RPO < 1m",
    tone: "raised",
  },
  {
    title: "Support Response Targets",
    body: "P1 incidents acknowledged within 1 hour, P2 within 4 hours, with defined escalation paths and transparent status communication.",
    icon: Activity,
    badge: "Tiered",
    tone: "default",
  },
] as const satisfies readonly HighlightCard[];

const POLICY_CLUSTERS = [
  {
    title: "Availability and Uptime",
    description:
      "Platform availability commitments with defined measurement methodology, exclusions, and service credit calculations.",
    lane: "operator",
    cards: [
      {
        title: "Uptime Target",
        body: "99.95% monthly uptime excluding scheduled maintenance, measured via automated health checks with 60-second intervals.",
        icon: CheckCircle,
        badge: "99.95%",
        tone: "premium",
      },
      {
        title: "Planned Maintenance",
        body: "Scheduled maintenance windows announced 7 days in advance via email and status page, limited to 4 hours per month.",
        icon: Wrench,
      },
      {
        title: "Measurement Method",
        body: "Uptime calculated from automated health endpoint monitoring across multiple geographic regions with sub-minute resolution.",
        icon: Activity,
      },
      {
        title: "Exclusions",
        body: "Force majeure events, third-party service failures beyond our control, and customer-initiated actions excluded from SLA calculations.",
        icon: AlertTriangle,
        badge: "Governed",
        tone: "muted",
      },
    ],
  },
  {
    title: "Recovery Objectives",
    description:
      "Incident response and data recovery commitments with defined RTO, RPO, and backup retention policies.",
    lane: "operator",
    columns: 2,
    cards: [
      {
        title: "Recovery Time Objective (RTO)",
        body: "Service restoration within 30 minutes for P1 incidents affecting core platform functions with automated failover.",
        icon: Clock,
        badge: "< 30 min",
        tone: "raised",
      },
      {
        title: "Recovery Point Objective (RPO)",
        body: "Continuous replication with RPO < 1 minute ensures minimal data loss during recovery operations.",
        icon: Database,
        badge: "< 1 min",
        tone: "raised",
      },
      {
        title: "Backup Retention",
        body: "Hourly snapshots retained for 30 days with point-in-time recovery capability and multi-region replication.",
        icon: Server,
      },
      {
        title: "Disaster Recovery",
        body: "Multi-AZ architecture with automated failover, tested quarterly, and documented runbooks for recovery procedures.",
        icon: Shield,
        badge: "Multi-AZ",
      },
    ],
  },
  {
    title: "Support Response Levels",
    description:
      "Tiered support response targets with defined severity levels, acknowledgment times, and escalation procedures.",
    lane: "institutional",
    cards: [
      {
        title: "P1 — Critical Impact",
        body: "Production system down or critical function unavailable. Initial response within 1 hour, 24/7 coverage.",
        icon: AlertTriangle,
        badge: "1h Response",
        tone: "raised",
      },
      {
        title: "P2 — High Impact",
        body: "Major feature degraded or significant performance impact. Initial response within 4 hours during business hours.",
        icon: Activity,
        badge: "4h Response",
      },
      {
        title: "P3 — Medium Impact",
        body: "Minor feature issue or moderate performance degradation. Initial response within 1 business day.",
        icon: Clock,
      },
      {
        title: "P4 — Low Impact",
        body: "General questions, feature requests, or minor issues. Initial response within 2 business days.",
        icon: FileText,
      },
    ],
  },
  {
    title: "Service Credits",
    description:
      "Automatic service credit calculations based on monthly uptime achievement with transparent claim procedures.",
    lane: "institutional",
    cards: [
      {
        title: "Credit Calculation",
        body: "Credits issued as percentage of monthly fee based on achieved uptime: < 99.95% = 10%, < 99.5% = 25%, < 99.0% = 50%.",
        icon: Scale,
        badge: "Tiered",
        tone: "premium",
      },
      {
        title: "Claim Procedure",
        body: "Submit credit request within 30 days of qualifying incident with documented impact. Credits applied to next billing cycle.",
        icon: FileText,
      },
      {
        title: "Maximum Credit",
        body: "Maximum service credit per month is 50% of monthly fee, applied automatically for verified SLA breaches.",
        icon: Shield,
        badge: "50% Cap",
      },
      {
        title: "Sole Remedy",
        body: "Service credits constitute the sole and exclusive remedy for SLA breaches, as detailed in Terms of Service.",
        icon: Scale,
      },
    ],
  },
] as const satisfies readonly PolicyCluster[];

function getBadgeToneForLane(lane: Lane): BadgeTone {
  return lane === "institutional" ? "premium" : "primary";
}

function getIconToneForLane(lane: Lane): string {
  return lane === "institutional" ? "text-premium" : "text-primary";
}

function HighlightsSection() {
  return (
    <AnimatedL1>
      <AnimatedGrid columns={2}>
        {HIGHLIGHT_CARDS.map((card) => (
          <AnimatedGridItem key={card.title}>
            <AnimatedCard tone={card.tone}>
              <MarketingInfoCardHeader>
                <div className="flex items-start justify-between gap-3">
                  <MarketingInfoCardTitle className="flex items-center gap-2">
                    <card.icon className="h-4 w-4 text-primary" aria-hidden />
                    {card.title}
                  </MarketingInfoCardTitle>
                  <AnimatedBadge tone="primary">{card.badge}</AnimatedBadge>
                </div>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-card-copy">{card.body}</p>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>
        ))}
      </AnimatedGrid>
    </AnimatedL1>
  );
}

function SectionHeader({
  title,
  description,
  badge,
  badgeTone,
}: {
  title: string;
  description: string;
  badge: string;
  badgeTone: BadgeTone;
}) {
  return (
    <AnimatedFadeIn>
      <MarketingInfoSectionHeader>
        <div className="flex items-center justify-between gap-3">
          <MarketingInfoSectionTitle>{title}</MarketingInfoSectionTitle>
          <AnimatedBadge tone={badgeTone}>{badge}</AnimatedBadge>
        </div>
        <MarketingInfoSectionDescription>{description}</MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>
    </AnimatedFadeIn>
  );
}

function PolicyCardGrid({ cluster }: { cluster: PolicyCluster }) {
  const laneBadgeTone = getBadgeToneForLane(cluster.lane);
  const laneIconClass = getIconToneForLane(cluster.lane);

  return (
    <AnimatedL1>
      <AnimatedGrid columns={cluster.columns ?? 2}>
        {cluster.cards.map((card) => (
          <AnimatedGridItem key={card.title}>
            <AnimatedCard tone={card.tone ?? "default"}>
              <MarketingInfoCardHeader>
                <div className="flex items-start justify-between gap-3">
                  <MarketingInfoCardTitle className="flex items-center gap-2">
                    <card.icon className={`h-4 w-4 ${laneIconClass}`} aria-hidden />
                    {card.title}
                  </MarketingInfoCardTitle>
                  {card.badge ? (
                    <AnimatedBadge tone={laneBadgeTone}>{card.badge}</AnimatedBadge>
                  ) : null}
                </div>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-card-copy">{card.body}</p>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>
        ))}
      </AnimatedGrid>
    </AnimatedL1>
  );
}

function PolicyClusterSection({ cluster, index }: { cluster: PolicyCluster; index: number }) {
  const badgeTone = getBadgeToneForLane(cluster.lane);
  const laneLabel = cluster.lane === "operator" ? "Operator Lane" : "Institutional Lane";

  return (
    <>
      {index > 0 ? <hr className="mi-separator" /> : null}
      <MarketingInfoSection>
        <SectionHeader
          title={cluster.title}
          description={cluster.description}
          badge={laneLabel}
          badgeTone={badgeTone}
        />
        <PolicyCardGrid cluster={cluster} />
      </MarketingInfoSection>
    </>
  );
}

export default function SLAPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: SLA_PAGE_JSON_LD_HTML }}
      />
      <MarketingInfoShell>
        <AnimatedFadeIn>
          <MarketingInfoHeader>
            <MarketingInfoKicker>Legal — Last Updated March 16, 2026</MarketingInfoKicker>
            <MarketingInfoTitle>
              Service commitments for governed enterprise operations.
            </MarketingInfoTitle>
            <MarketingInfoDescription>
              AFENDA defines measurable targets for availability, recovery, support response, and
              operational transparency.
            </MarketingInfoDescription>
            <MarketingInfoMeta>
              <AnimatedBadge tone="primary">
                <CheckCircle className="mr-1.5 inline h-3 w-3" aria-hidden />
                99.95% Uptime
              </AnimatedBadge>
              <AnimatedBadge tone="primary">
                <Clock className="mr-1.5 inline h-3 w-3" aria-hidden />
                RTO &lt; 30m
              </AnimatedBadge>
              <AnimatedBadge tone="primary">
                <Activity className="mr-1.5 inline h-3 w-3" aria-hidden />
                RPO &lt; 1m
              </AnimatedBadge>
            </MarketingInfoMeta>
          </MarketingInfoHeader>
        </AnimatedFadeIn>

        <MarketingInfoContent>
          <AnimatedFadeIn>
            <div className="mi-prose">
              <p>
                This SLA defines AFENDA commitments for platform availability, incident recovery,
                support response, and service credits.
              </p>
            </div>
          </AnimatedFadeIn>
          <hr className="mi-separator" />
          <HighlightsSection />

          <hr className="mi-separator" />
          {POLICY_CLUSTERS.map((cluster, index) => (
            <PolicyClusterSection key={cluster.title} cluster={cluster} index={index} />
          ))}

          <hr className="mi-separator" />

          <AnimatedFadeIn>
            <div className="mi-prose">
              <p>
                For SLA claims, contact{" "}
                <a href="mailto:legal@nexuscanon.com" className="text-primary hover:underline">
                  legal@nexuscanon.com
                </a>{" "}
                within 30 days of the qualifying incident.
              </p>
              <p>
                Live operational transparency is available on{" "}
                <Link href="/status">System Status</Link>.
              </p>
            </div>
          </AnimatedFadeIn>
        </MarketingInfoContent>

        <AnimatedFadeIn>
          <MarketingInfoFooter>
            <MarketingInfoCta>
              <MarketingInfoCtaTitle>Related trust documents</MarketingInfoCtaTitle>
              <MarketingInfoCtaBody>
                Review adjacent operational and legal surfaces connected to this SLA.
              </MarketingInfoCtaBody>
              <MarketingInfoCtaRow>
                <Button asChild size="sm">
                  <Link href="/status">System Status</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/terms">Terms of Service</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/privacy">Privacy Policy</Link>
                </Button>
              </MarketingInfoCtaRow>
            </MarketingInfoCta>
          </MarketingInfoFooter>
        </AnimatedFadeIn>
      </MarketingInfoShell>
    </>
  );
}
