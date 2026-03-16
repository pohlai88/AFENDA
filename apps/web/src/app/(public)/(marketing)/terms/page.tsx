import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle,
  Shield,
  FileText,
  Database,
  Gauge,
  AlertTriangle,
  UserCheck,
  Lock,
  Scale,
  Ban,
  Gavel,
  Landmark,
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

// Premium animation wrappers
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
  readonly lane: "brand" | "operator" | "institutional";
  readonly columns?: 1 | 2 | 3;
  readonly cards: readonly PolicyCard[];
}

type BadgeTone = "primary" | "premium";

const HIGHLIGHT_CARDS = [
  {
    title: "Service Access",
    body: "Access to AFENDA is provided under your organization's subscription or order form and subject to these terms.",
    icon: FileText,
    badge: "Contract",
    tone: "muted",
  },
  {
    title: "Reliability Commitments",
    body: "We operate with defined availability and recovery targets, backed by tested backup and restore procedures.",
    icon: Gauge,
    badge: "SLA",
    tone: "default",
  },
  {
    title: "Responsible Use",
    body: "Customers must use the platform lawfully, protect credentials, and avoid actions that degrade service quality.",
    icon: UserCheck,
    badge: "Policy",
    tone: "premium",
  },
  {
    title: "Data Governance",
    body: "Customer data remains fully owned by the customer with export and retention controls defined by policy.",
    icon: Shield,
    badge: "Trust",
    tone: "default",
  },
] as const satisfies readonly HighlightCard[];

const POLICY_CLUSTERS = [
  {
    title: "Platform Access and Responsible Use",
    description:
      "The foundations of the agreement: acceptance, authorized access, and prohibited behavior.",
    lane: "institutional",
    cards: [
      {
        title: "Acceptance of Terms",
        body: "AFENDA is an audit-first ERP platform designed for secure, traceable, and governed enterprise operations. Continued use of the platform constitutes acceptance of these terms.",
        icon: CheckCircle,
        badge: "Required",
        tone: "muted",
      },
      {
        title: "Customer Responsibilities",
        body: "Protect credentials, apply least-privilege access controls, ensure lawful data submission, and maintain internal approval discipline for critical workflows.",
        icon: UserCheck,
        badge: "Governance",
      },
      {
        title: "Acceptable Use Restrictions",
        body: "You must not violate laws, infringe intellectual property, transmit malware, attempt unauthorized access, or interfere with service availability.",
        icon: Ban,
        badge: "Prohibited",
        tone: "raised",
      },
      {
        title: "Account Accountability",
        body: "Organizations are accountable for activity executed through their workspace, users, and issued credentials.",
        icon: Lock,
        badge: "Accountability",
      },
    ],
  },
  {
    title: "Service and Reliability Commitments",
    description:
      "Core platform capabilities and measurable service targets under NexusCanon Infrastructure Fabric.",
    lane: "operator",
    columns: 3,
    cards: [
      {
        title: "Database Engine",
        body: "NexusCanon with PostgreSQL compatibility for enterprise-grade transactional workloads.",
        icon: Database,
      },
      {
        title: "Elastic Compute",
        body: "Auto-scaling from 0.25 to 8 CU with scale-to-zero support.",
        icon: Gauge,
      },
      {
        title: "Backup and Recovery",
        body: "Hourly snapshots with 30-day point-in-time recovery.",
        icon: Shield,
      },
      {
        title: "Availability Targets",
        body: "99.95% monthly uptime, RTO under 30 minutes, and RPO under 1 minute.",
        icon: CheckCircle,
        badge: "SLA",
        tone: "raised",
      },
      {
        title: "Durability and Scale",
        body: "99.999999999% durability, scale operations under 10 seconds, and cold starts under 500ms.",
        icon: Gauge,
      },
      {
        title: "Primary Region",
        body: "ap-southeast-1 (Singapore) with multi-AZ deployment and automatic failover.",
        icon: Landmark,
      },
    ],
  },
  {
    title: "Data Ownership, Security, and Compliance",
    description:
      "How AFENDA protects, stores, and certifies customer data while preserving ownership and export rights.",
    lane: "institutional",
    cards: [
      {
        title: "Data Ownership and Export",
        body: "You retain full ownership of submitted data, with export available in standard PostgreSQL dump format at any time.",
        icon: FileText,
        badge: "Customer Rights",
      },
      {
        title: "Backup and Retention Controls",
        body: "Hourly snapshots, continuous WAL archiving, and 30-day point-in-time recovery with second-level granularity.",
        icon: Lock,
      },
      {
        title: "Secure Deletion",
        body: "Cryptographic erasure occurs within 30 days of account closure, subject to legal and regulatory retention requirements.",
        icon: AlertTriangle,
        tone: "raised",
      },
      {
        title: "Compliance Baseline",
        body: "SOC 2 Type II controls, HIPAA BAA availability, GDPR and CCPA alignment, and ISO 27001 in progress.",
        icon: Shield,
        badge: "Institutional",
        tone: "premium",
      },
    ],
  },
  {
    title: "Legal Remedies and Jurisdiction",
    description:
      "Liability boundaries, termination handling, and governing law for dispute resolution.",
    lane: "institutional",
    cards: [
      {
        title: "Limitation of Liability",
        body: "AFENDA is not liable for indirect, incidental, special, consequential, or punitive damages. Total aggregate liability is limited to fees paid in the 12 months preceding the claim.",
        icon: Scale,
        badge: "Liability Cap",
        tone: "muted",
      },
      {
        title: "Termination and Data Window",
        body: "You may terminate under subscription terms. Data is retained for 30 days to support recovery and export prior to permanent deletion.",
        icon: Gavel,
      },
      {
        title: "Governing Law",
        body: "These terms are governed by the laws of Singapore, with arbitration as defined in applicable order forms or master agreements.",
        icon: Landmark,
      },
      {
        title: "Claims and Notice",
        body: "Formal claims and legal notices must follow the procedures and contact methods defined in your signed commercial agreement.",
        icon: FileText,
        badge: "Procedure",
        tone: "raised",
      },
    ],
  },
] as const satisfies readonly PolicyCluster[];

export const metadata: Metadata = {
  title: "Terms of Service — AFENDA | Business Truth Engine",
  description:
    "Terms of service, acceptable use policy, and enterprise service commitments for AFENDA platform.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — AFENDA | Business Truth Engine",
    description:
      "Enterprise terms: 99.95% uptime guarantee, data ownership, security commitments, and responsible use policy.",
    type: "website",
    url: "/terms",
  },
};

const TERMS_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Terms of Service — AFENDA",
  description: "Terms of service, acceptable use policy, and enterprise SLA for AFENDA.",
  url: "https://afenda.com/terms",
} as const;

const TERMS_PAGE_JSON_LD_HTML = JSON.stringify(TERMS_PAGE_JSON_LD).replace(/</g, "\\u003c");

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
  badgeTone = "premium",
}: {
  title: string;
  description: string;
  badge: string;
  badgeTone?: "primary" | "premium";
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

function getBadgeToneForLane(lane: PolicyCluster["lane"]): BadgeTone {
  return lane === "institutional" ? "premium" : "primary";
}

function getIconToneForLane(lane: PolicyCluster["lane"]): string {
  return lane === "institutional" ? "text-premium" : "text-primary";
}

function PolicyCardGrid({
  cards,
  lane,
  columns = 2,
}: {
  cards: readonly PolicyCard[];
  lane: PolicyCluster["lane"];
  columns?: 1 | 2 | 3;
}) {
  const laneBadgeTone = getBadgeToneForLane(lane);
  const laneIconClass = getIconToneForLane(lane);

  return (
    <AnimatedL1>
      <AnimatedGrid columns={columns}>
        {cards.map((card) => (
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
        <PolicyCardGrid cards={cluster.cards} lane={cluster.lane} columns={cluster.columns ?? 2} />
      </MarketingInfoSection>
    </>
  );
}

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: TERMS_PAGE_JSON_LD_HTML }}
      />
      <MarketingInfoShell>
        <AnimatedFadeIn>
          <MarketingInfoHeader>
            <MarketingInfoKicker>Legal — Last Updated March 16, 2026</MarketingInfoKicker>
            <MarketingInfoTitle>Terms of Service</MarketingInfoTitle>
            <MarketingInfoDescription>
              Enterprise service commitments, acceptable use policy, data ownership, and operational
              transparency. By accessing AFENDA, you agree to these terms.
            </MarketingInfoDescription>
            <MarketingInfoMeta>
              <AnimatedBadge tone="primary">
                <CheckCircle className="mr-1.5 inline h-3 w-3" aria-hidden />
                99.95% Uptime
              </AnimatedBadge>
              <AnimatedBadge tone="premium">
                <Shield className="mr-1.5 inline h-3 w-3" aria-hidden />
                SOC 2 Type II
              </AnimatedBadge>
              <AnimatedBadge tone="premium">
                <FileText className="mr-1.5 inline h-3 w-3" aria-hidden />
                Data Ownership
              </AnimatedBadge>
            </MarketingInfoMeta>
          </MarketingInfoHeader>
        </AnimatedFadeIn>

        <MarketingInfoContent>
          <HighlightsSection />

          <hr className="mi-separator" />
          {POLICY_CLUSTERS.map((cluster, index) => (
            <PolicyClusterSection key={cluster.title} cluster={cluster} index={index} />
          ))}

          <hr className="mi-separator" />

          <AnimatedFadeIn>
            <div className="mi-prose">
              <p>
                For questions about these terms, contact{" "}
                <a href="mailto:legal@nexuscanon.com" className="text-primary hover:underline">
                  legal@nexuscanon.com
                </a>
                .
              </p>
            </div>
          </AnimatedFadeIn>
        </MarketingInfoContent>

        <AnimatedFadeIn>
          <MarketingInfoFooter>
            <div className="mi-cta">
              <h2 className="mi-cta-title">Related legal policies</h2>
              <p className="mi-cta-body">
                Review our complete legal framework including privacy policy, cookie policy, SLA
                commitments, and PDPA compliance documentation.
              </p>
              <div className="mi-cta-row">
                <Button asChild variant="outline">
                  <Link href="/privacy">Privacy Policy</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sla">Service Level Agreement</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/pdpa">PDPA Compliance</Link>
                </Button>
              </div>
            </div>
          </MarketingInfoFooter>
        </AnimatedFadeIn>
      </MarketingInfoShell>
    </>
  );
}
