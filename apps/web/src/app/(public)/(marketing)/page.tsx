import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
} from "./_components/marketing-info-shell";
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
} from "./_components/marketing-info-primitives";
import {
  AnimatedCard,
  AnimatedBadge,
  AnimatedL1,
  AnimatedGrid,
  AnimatedGridItem,
} from "./_components/marketing-info-animated";
import {
  PremiumShield,
  PremiumGitBranch,
  PremiumFileCheck,
  PremiumSparkles,
} from "./_components/premium-illustrations";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "AFENDA — Business Truth Engine for Governed Enterprise Operations",
  description:
    "AFENDA is an audit-first enterprise platform that preserves evidence, governs execution, and turns operational activity into durable institutional truth.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AFENDA — Business Truth Engine",
    description:
      "Audit-first enterprise platform for governed operations, durable evidence, and institutional clarity.",
    type: "website",
    url: "/",
  },
};

const HOME_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AFENDA",
  applicationCategory: "Enterprise Resource Planning",
  operatingSystem: "Web",
  description:
    "AFENDA is an audit-first enterprise platform that preserves evidence, governs execution, and turns operational activity into durable institutional truth.",
  url: "https://afenda.com",
  offers: {
    "@type": "Offer",
    category: "Enterprise Software",
  },
} as const;

const HOME_PAGE_JSON_LD_HTML = JSON.stringify(HOME_PAGE_JSON_LD).replace(/</g, "\\u003c");

interface CoreCapability {
  readonly icon: "shield" | "gitbranch" | "filecheck" | "sparkles";
  readonly title: string;
  readonly description: string;
  readonly lane: "primary" | "interactive" | "premium";
}

const CORE_CAPABILITIES = [
  {
    icon: "shield",
    title: "NexusCanon Governance",
    description:
      "Operational complexity captured as reality. Truth preserved, traceable, and verifiable across time.",
    lane: "primary",
  },
  {
    icon: "gitbranch",
    title: "Dual-Kernel Architecture",
    description:
      "Cobalt execution kernel for speed. Quorum oversight kernel for control. Balanced without disconnection.",
    lane: "interactive",
  },
  {
    icon: "filecheck",
    title: "Audit-First Operations",
    description:
      "Immutable audit history, 6W1H traceability, and durable evidence retention across all material actions.",
    lane: "premium",
  },
  {
    icon: "sparkles",
    title: "Adaptive Intelligence",
    description:
      "CRUD-SAP lifecycle discipline with predictive foresight. Organizations evolve without losing institutional memory.",
    lane: "primary",
  },
] as const satisfies readonly CoreCapability[];

const ICON_MAP = {
  shield: PremiumShield,
  gitbranch: PremiumGitBranch,
  filecheck: PremiumFileCheck,
  sparkles: PremiumSparkles,
} as const;

interface TruthPillar {
  readonly label: string;
  readonly text: string;
}

const TRUTH_PILLARS = [
  {
    label: "Chaos Connected",
    text: "Operational complexity captured as reality, not suppressed as noise.",
  },
  {
    label: "Truth Preserved",
    text: "Records remain governed, traceable, and verifiable across time.",
  },
  {
    label: "Direction Aligned",
    text: "Execution stays connected to enterprise intent, control, and strategic purpose.",
  },
  {
    label: "Evolution Enabled",
    text: "Organizations adapt without losing institutional memory or structural discipline.",
  },
] as const satisfies readonly TruthPillar[];

function CoreCapabilitiesSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Core capabilities</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          AFENDA embeds enterprise disciplines that convert fragmented activity into governed
          intelligence.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedGrid columns={2}>
          {CORE_CAPABILITIES.map((capability) => {
            const Icon = ICON_MAP[capability.icon];
            return (
              <AnimatedGridItem key={capability.title}>
                <AnimatedCard>
                  <MarketingInfoCardHeader>
                    <span className={`mi-card-kicker mi-card-kicker--${capability.lane}`}>
                      <Icon size={20} className="inline-block mr-2 align-text-bottom" aria-hidden />
                      {capability.lane.charAt(0).toUpperCase() + capability.lane.slice(1)}
                    </span>
                    <MarketingInfoCardTitle>{capability.title}</MarketingInfoCardTitle>
                  </MarketingInfoCardHeader>
                  <MarketingInfoCardBody>
                    <p className="mi-card-copy">{capability.description}</p>
                  </MarketingInfoCardBody>
                </AnimatedCard>
              </AnimatedGridItem>
            );
          })}
        </AnimatedGrid>
      </AnimatedL1>
    </MarketingInfoSection>
  );
}

function BusinessTruthSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Business truth engine</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          AFENDA is not a system of scattered features. It is designed as a Business Truth Engine
          that captures complexity, governs meaning, and allows organizations to evolve without
          erasing what matters.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <MarketingInfoCard tone="premium">
        <MarketingInfoCardHeader>
          <span className="mi-card-kicker mi-card-kicker--premium">Philosophy</span>
          <MarketingInfoCardTitle>
            From software records to institutional truth
          </MarketingInfoCardTitle>
        </MarketingInfoCardHeader>
        <MarketingInfoCardBody>
          <ul className="mi-card-list">
            {TRUTH_PILLARS.map((pillar) => (
              <li key={pillar.label}>
                <strong>{pillar.label}</strong> — {pillar.text}
              </li>
            ))}
          </ul>
        </MarketingInfoCardBody>
      </MarketingInfoCard>
    </MarketingInfoSection>
  );
}

function PlatformOverviewSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Platform architecture</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          Built on NexusCanon governance doctrine and AXIS architectural compass for disciplined
          enterprise operation.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedGrid columns={2}>
          <AnimatedGridItem>
            <AnimatedCard tone="raised">
              <MarketingInfoCardHeader>
                <span className="mi-card-kicker mi-card-kicker--primary">Governance Doctrine</span>
                <MarketingInfoCardTitle>NexusCanon</MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-card-copy">
                  The convergence of data, actors, events, and decisions across real-world
                  operations — validated, preserved, and stabilized so enterprise records remain
                  dependable across time.
                </p>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>

          <AnimatedGridItem>
            <AnimatedCard tone="raised">
              <MarketingInfoCardHeader>
                <span className="mi-card-kicker mi-card-kicker--interactive">
                  Architectural Compass
                </span>
                <MarketingInfoCardTitle>AXIS</MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-card-copy">
                  Aligns workflows, decisions, and movement so execution stays coherent at scale.
                  Direction without rigidity. Structure without brittleness.
                </p>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>
        </AnimatedGrid>
      </AnimatedL1>
    </MarketingInfoSection>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: HOME_PAGE_JSON_LD_HTML }}
      />

      <MarketingInfoShell>
        <MarketingInfoHeader>
          <MarketingInfoKicker>Welcome to AFENDA</MarketingInfoKicker>
          <MarketingInfoTitle>Built for truth. Engineered for accountability.</MarketingInfoTitle>
          <MarketingInfoDescription>
            AFENDA is an audit-first enterprise platform that preserves evidence, governs execution,
            and turns operational activity into durable institutional truth. Designed for
            organizations that need more than transactional software.
          </MarketingInfoDescription>
          <MarketingInfoMeta>
            <AnimatedBadge tone="primary">NexusCanon governance</AnimatedBadge>
            <AnimatedBadge tone="premium">AXIS architectural compass</AnimatedBadge>
            <AnimatedBadge tone="premium">Audit-first architecture</AnimatedBadge>
          </MarketingInfoMeta>
        </MarketingInfoHeader>

        <MarketingInfoContent>
          <div className="mi-prose">
            <p>
              Enterprise systems should not merely record activity. They should establish what can
              be trusted, explain how it emerged, and preserve that truth over time. AFENDA is
              structured on the <strong>NexusCanon governance doctrine</strong> and oriented by the{" "}
              <strong>AXIS architectural compass</strong>. Together, they create a disciplined
              operating environment for organizations that require clarity, accountability, and
              adaptive intelligence without sacrificing control.
            </p>
          </div>

          <hr className="mi-separator" />

          <CoreCapabilitiesSection />

          <hr className="mi-separator" />

          <PlatformOverviewSection />

          <hr className="mi-separator" />

          <BusinessTruthSection />
        </MarketingInfoContent>

        <MarketingInfoFooter>
          <MarketingInfoCta>
            <MarketingInfoCtaTitle>Explore the business truth engine</MarketingInfoCtaTitle>
            <MarketingInfoCtaBody>
              Learn more about AFENDA's governance doctrine, architectural discipline, and the
              philosophy behind audit-first enterprise operations.
            </MarketingInfoCtaBody>
            <MarketingInfoCtaRow>
              <Button asChild size="lg">
                <Link href="/about">
                  About AFENDA <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </MarketingInfoCtaRow>
          </MarketingInfoCta>
        </MarketingInfoFooter>
      </MarketingInfoShell>
    </>
  );
}
