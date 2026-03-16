import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Shield,
  FileText,
  Lock,
  Database,
  CheckCircle,
  KeyRound,
  Globe,
  UserCheck,
  Trash2,
  Scale,
  AlertTriangle,
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

const HIGHLIGHT_CARDS = [
  {
    title: "No Data Selling",
    body: "Personal data is never sold, rented, or monetized. Processing is limited to service delivery, security, and compliance duties.",
    icon: Shield,
    badge: "Trust",
    tone: "muted",
  },
  {
    title: "Retention Discipline",
    body: "Account data is retained while active and removed within 30 days after closure, subject to lawful retention obligations.",
    icon: Trash2,
    badge: "Retention",
    tone: "default",
  },
  {
    title: "Encryption by Default",
    body: "AES-256-GCM at rest and TLS 1.3 in transit protect customer data across all environments.",
    icon: Lock,
    badge: "Security",
    tone: "default",
  },
  {
    title: "Governed Infrastructure",
    body: "Multi-AZ reliability, PITR, and policy-based tenant isolation support stable enterprise operations.",
    icon: Database,
    badge: "Platform",
    tone: "premium",
  },
] as const satisfies readonly HighlightCard[];

const POLICY_CLUSTERS = [
  {
    title: "Processing and Governance Basis",
    description:
      "How AFENDA collects, processes, and retains personal information under governed enterprise operations.",
    lane: "institutional",
    cards: [
      {
        title: "Collection and Processing Scope",
        body: "AFENDA collects information you provide directly, plus service-generated operational data, access records, and audit events required to run the platform.",
        icon: FileText,
        badge: "Scope",
        tone: "muted",
      },
      {
        title: "Use of Information",
        body: "Information is used to operate and secure the service, support customers, improve performance, and fulfill legal and contractual obligations.",
        icon: CheckCircle,
      },
      {
        title: "Legal Basis",
        body: "Where applicable, processing is based on contractual necessity, legitimate interests, legal obligations, and consent when required.",
        icon: Scale,
      },
      {
        title: "Retention and Erasure",
        body: "Deleted account data is securely purged within 30 days where permitted, while required audit records may be retained longer for governance and regulatory needs.",
        icon: Trash2,
        badge: "30 Days",
        tone: "raised",
      },
    ],
  },
  {
    title: "Infrastructure and Security Controls",
    description:
      "Core platform controls for residency, encryption, resilience, and subprocessor operations.",
    lane: "operator",
    columns: 2,
    cards: [
      {
        title: "Data Residency",
        body: "Primary data residency is in ap-southeast-1 (Singapore) with governed operational controls.",
        icon: Globe,
      },
      {
        title: "Encryption and Key Management",
        body: "AES-256-GCM encryption at rest, TLS 1.3 in transit, and hardware-backed key management protect sensitive data.",
        icon: KeyRound,
        badge: "AES-256-GCM",
      },
      {
        title: "Reliability and Recovery",
        body: "Hourly snapshots, 30-day point-in-time recovery, and multi-AZ failover controls support continuity.",
        icon: Database,
      },
      {
        title: "Subprocessor Boundaries",
        body: "Data is shared only with vetted subprocessors and infrastructure partners that are necessary to operate the service.",
        icon: AlertTriangle,
        badge: "Vetted",
        tone: "raised",
      },
    ],
  },
  {
    title: "Data Subject Rights and Compliance",
    description:
      "Rights handling and assurance programs aligned to enterprise privacy requirements.",
    lane: "institutional",
    cards: [
      {
        title: "Access and Correction",
        body: "You may request access to your personal data and correction of inaccurate information where permitted by law.",
        icon: UserCheck,
      },
      {
        title: "Deletion and Portability",
        body: "You may request deletion and data export in machine-readable format subject to legal and contractual limitations.",
        icon: FileText,
      },
      {
        title: "Objection and Restriction",
        body: "You may object to or request restriction of certain processing activities depending on jurisdiction.",
        icon: Scale,
      },
      {
        title: "Compliance Baseline",
        body: "Controls align with SOC 2 Type II, HIPAA BAA support, GDPR, CCPA, and ongoing ISO 27001 program work.",
        icon: Shield,
        badge: "Institutional",
        tone: "premium",
      },
    ],
  },
] as const satisfies readonly PolicyCluster[];

export const metadata: Metadata = {
  title: "Privacy Policy — AFENDA | Business Truth Engine",
  description:
    "Enterprise privacy commitments with governed processing, zero data selling, AES-256-GCM encryption, and PDPA compliance.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — AFENDA",
    description:
      "Enterprise privacy commitments with governed processing, security controls, and compliance alignment.",
    type: "website",
    url: "/privacy",
  },
};

const PRIVACY_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy Policy — AFENDA",
  description:
    "Enterprise privacy commitments with governed processing, security controls, and compliance alignment.",
  url: "https://afenda.com/privacy",
} as const;

const PRIVACY_PAGE_JSON_LD_HTML = JSON.stringify(PRIVACY_PAGE_JSON_LD).replace(/</g, "\\u003c");

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

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: PRIVACY_PAGE_JSON_LD_HTML }}
      />

      <MarketingInfoShell width="narrow">
        <AnimatedFadeIn>
          <MarketingInfoHeader>
            <MarketingInfoKicker>Legal — Last Updated March 16, 2026</MarketingInfoKicker>
            <MarketingInfoTitle>
              Privacy commitments for governed enterprise operations.
            </MarketingInfoTitle>
            <MarketingInfoDescription>
              AFENDA processes data with controlled use, secure infrastructure, clear retention
              rules, and accountable governance.
            </MarketingInfoDescription>
            <MarketingInfoMeta>
              <AnimatedBadge tone="primary">
                <Shield className="mr-1.5 inline h-3 w-3" aria-hidden />
                No Data Selling
              </AnimatedBadge>
              <AnimatedBadge tone="primary">
                <FileText className="mr-1.5 inline h-3 w-3" aria-hidden />
                Rights Handling
              </AnimatedBadge>
              <AnimatedBadge tone="premium">
                <Lock className="mr-1.5 inline h-3 w-3" aria-hidden />
                AES-256-GCM
              </AnimatedBadge>
            </MarketingInfoMeta>
          </MarketingInfoHeader>
        </AnimatedFadeIn>

        <MarketingInfoContent>
          <AnimatedFadeIn>
            <div className="mi-prose">
              <p>
                This policy explains how AFENDA collects, uses, protects, and retains personal data
                in connection with the platform.
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
                To exercise rights or request privacy support, contact{" "}
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
            <MarketingInfoCta>
              <MarketingInfoCtaTitle>Related trust documents</MarketingInfoCtaTitle>
              <MarketingInfoCtaBody>
                Review adjacent policy and trust surfaces for cookies, terms, and regional
                compliance.
              </MarketingInfoCtaBody>
              <MarketingInfoCtaRow>
                <Button asChild size="sm">
                  <Link href="/terms">Terms of Service</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/sla">Service Level Agreement</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/cookie-policy">Cookie Policy</Link>
                </Button>
              </MarketingInfoCtaRow>
            </MarketingInfoCta>
          </MarketingInfoFooter>
        </AnimatedFadeIn>
      </MarketingInfoShell>
    </>
  );
}
