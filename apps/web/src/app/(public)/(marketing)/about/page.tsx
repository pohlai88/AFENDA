import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Compass, ShieldCheck, Workflow, Scale } from "lucide-react";

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
import {
  PremiumArchitecture,
  PremiumAuditTrail,
  PremiumDataFlow,
  PremiumDatabase,
} from "../_components/premium-illustrations";

export const dynamic = "force-static";

interface ListItem {
  readonly label: string;
  readonly text: string;
}

interface CoreDiscipline {
  readonly title: string;
  readonly description: string;
  readonly items?: readonly ListItem[];
}

interface Pillar {
  readonly term: string;
  readonly def: string;
}

export const metadata: Metadata = {
  title: "About — AFENDA | Business Truth Engine",
  description:
    "Learn about AFENDA and NexusCanon — the governance doctrine, architectural discipline, and business truth model behind the platform.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — AFENDA | Business Truth Engine",
    description:
      "AFENDA is a business truth engine built for governed enterprise operations, durable evidence, and institutional clarity.",
    type: "website",
    url: "/about",
  },
};

const CORE_DISCIPLINES = [
  {
    title: "CRUD-SAP Framework",
    description:
      "A full-lifecycle operating discipline that governs information from origination to foresight.",
    items: [
      { label: "C", text: "Create" },
      { label: "R", text: "Read" },
      { label: "U", text: "Update" },
      { label: "D", text: "Delete" },
      { label: "S", text: "Search" },
      { label: "A", text: "Audit" },
      { label: "P", text: "Predict" },
    ],
  },
  {
    title: "6W1H Traceability",
    description:
      "Context captured across every material action so enterprise records preserve meaning, accountability, and evidence.",
    items: [
      { label: "Who", text: "Actor identity" },
      { label: "What", text: "Action performed" },
      { label: "When", text: "Temporal context" },
      { label: "Where", text: "System or location context" },
      { label: "Why", text: "Business justification" },
      { label: "Which", text: "Affected object or resource" },
      { label: "How", text: "Method or governing process" },
    ],
  },
  {
    title: "Evidence & Audit Ledgering",
    description:
      "Immutable audit history, durable evidence retention, and continuous verification across operational records.",
  },
  {
    title: "Process Canonization",
    description:
      "Governed execution paths that reduce ambiguity, limit drift, and standardize how work becomes institutional truth.",
  },
] as const satisfies readonly CoreDiscipline[];

const DUAL_KERNEL = [
  {
    title: "Cobalt — Execution Kernel",
    description:
      "The execution kernel is optimized for movement: operations, tasks, field activity, and real-time state transition.",
    features: [
      "Operational workflows and execution paths",
      "Real-time capture, processing, and handoff",
      "Field-facing and action-oriented interfaces",
      "Transactional state changes at speed",
      "Built for responsiveness without abandoning structure",
    ],
    lane: "interactive" as const,
  },
  {
    title: "Quorum — Oversight Kernel",
    description:
      "The oversight kernel is optimized for control: validation, approvals, compliance, and collective authority.",
    features: [
      "Approval and authorization discipline",
      "Policy enforcement and control validation",
      "Audit verification and reporting surfaces",
      "Consensus, sign-off, and governed review",
      "Built for assurance, integrity, and decision legitimacy",
    ],
    lane: "premium" as const,
  },
] as const;

const TRUTH_ENGINE_PILLARS = [
  {
    term: "Chaos Connected",
    def: "Operational complexity is captured as reality, not suppressed as noise.",
  },
  {
    term: "Truth Preserved",
    def: "Records remain governed, traceable, and verifiable across time.",
  },
  {
    term: "Direction Aligned",
    def: "Execution remains connected to enterprise intent, control, and strategic purpose.",
  },
  {
    term: "Evolution Enabled",
    def: "Organizations can adapt without losing institutional memory or structural discipline.",
  },
] as const satisfies readonly Pillar[];

const ABOUT_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AFENDA",
  applicationCategory: "Enterprise Resource Planning",
  operatingSystem: "Web",
  description:
    "AFENDA is a business truth engine built for governed enterprise operations, durable evidence, and institutional clarity.",
  url: "https://afenda.com/about",
} as const;

const ABOUT_PAGE_JSON_LD_HTML = JSON.stringify(ABOUT_PAGE_JSON_LD).replace(/</g, "\\u003c");

function GovernanceSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <span className="inline-flex items-center gap-2">
            <PremiumArchitecture size={18} />
            1. The doctrine behind the platform
          </span>
        </MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          AFENDA is shaped by three connected ideas: governance, orientation, and adaptive
          enterprise execution.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1 className="mi-grid">
        <AnimatedCard tone="raised">
          <MarketingInfoCardHeader>
            <span className="mi-card-kicker mi-card-kicker--primary inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Governance
            </span>
            <MarketingInfoCardTitle>NexusCanon — Governance Doctrine</MarketingInfoCardTitle>
          </MarketingInfoCardHeader>
          <MarketingInfoCardBody>
            <p className="mi-card-copy">
              NexusCanon defines how AFENDA interprets enterprise reality. Operations evolve, but
              institutional truth must remain stable.
            </p>
            <ul className="mi-card-list">
              <li>
                <strong>Nexus</strong> — the living convergence of data, actors, events, and
                decisions across real-world operations.
              </li>
              <li>
                <strong>Canon</strong> — the governing standard that validates, preserves, and
                stabilizes enterprise records so they remain dependable across time.
              </li>
            </ul>
          </MarketingInfoCardBody>
        </AnimatedCard>

        <AnimatedGrid columns={2}>
          <AnimatedGridItem>
            <AnimatedCard>
              <MarketingInfoCardHeader>
                <span className="mi-card-kicker mi-card-kicker--interactive inline-flex items-center gap-1.5">
                  <Compass className="h-4 w-4" aria-hidden />
                  Orientation
                </span>
                <MarketingInfoCardTitle>AXIS — Architectural Compass</MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-card-copy">
                  AXIS aligns workflows, decisions, and movement so execution stays coherent at
                  scale.
                </p>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>

          <AnimatedGridItem>
            <AnimatedCard>
              <MarketingInfoCardHeader>
                <span className="mi-card-kicker mi-card-kicker--premium inline-flex items-center gap-1.5">
                  <PremiumDataFlow size={14} />
                  Surface
                </span>
                <MarketingInfoCardTitle>
                  AFENDA — Adaptive Operational Surface
                </MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-card-copy">
                  The operating surface where teams evolve and scale without breaking governance or
                  evidence continuity.
                </p>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>
        </AnimatedGrid>
      </AnimatedL1>
    </MarketingInfoSection>
  );
}

function DisciplinesSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <span className="inline-flex items-center gap-2">
            <PremiumDatabase size={18} />
            2. Operational disciplines
          </span>
        </MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          AFENDA embeds enterprise disciplines that convert fragmented activity into governed
          intelligence.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedGrid columns={2}>
          {CORE_DISCIPLINES.map((discipline) => (
            <AnimatedGridItem key={discipline.title}>
              <AnimatedCard>
                <MarketingInfoCardHeader>
                  <span className="mi-card-kicker mi-card-kicker--interactive inline-flex items-center gap-1.5">
                    <Activity className="h-4 w-4" aria-hidden />
                    Discipline
                  </span>
                  <MarketingInfoCardTitle>{discipline.title}</MarketingInfoCardTitle>
                </MarketingInfoCardHeader>
                <MarketingInfoCardBody>
                  <p className="mi-card-copy">{discipline.description}</p>
                  {"items" in discipline && discipline.items ? (
                    <ul className="mi-card-list">
                      {discipline.items.map((item: ListItem) => (
                        <li key={item.label}>
                          <strong>{item.label}</strong> — {item.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </MarketingInfoCardBody>
              </AnimatedCard>
            </AnimatedGridItem>
          ))}
        </AnimatedGrid>
      </AnimatedL1>
    </MarketingInfoSection>
  );
}

function DualKernelSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <span className="inline-flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" aria-hidden />
            3. Execution and oversight
          </span>
        </MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          AFENDA balances speed and control through a dual-kernel architecture that separates action
          from authority without disconnecting them.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedGrid columns={2}>
          {DUAL_KERNEL.map((kernel) => (
            <AnimatedGridItem key={kernel.title}>
              <AnimatedCard tone="muted">
                <MarketingInfoCardHeader>
                  <span className={`mi-card-kicker mi-card-kicker--${kernel.lane} inline-flex items-center gap-1.5`}>
                    {kernel.lane === "interactive" ? (
                      <Workflow className="h-4 w-4" aria-hidden />
                    ) : (
                      <Scale className="h-4 w-4" aria-hidden />
                    )}
                    {kernel.lane === "interactive" ? "Execution" : "Oversight"}
                  </span>
                  <MarketingInfoCardTitle>{kernel.title}</MarketingInfoCardTitle>
                </MarketingInfoCardHeader>
                <MarketingInfoCardBody>
                  <p className="mi-card-copy">{kernel.description}</p>
                  <ul className="mi-card-list">
                    {kernel.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
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

function TruthEngineSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <span className="inline-flex items-center gap-2">
            <PremiumAuditTrail size={18} />
            4. Why AFENDA exists
          </span>
        </MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          AFENDA is built to turn enterprise activity into something durable: evidence, coherence,
          and truth.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedCard tone="premium">
          <MarketingInfoCardHeader>
            <span className="mi-card-kicker mi-card-kicker--premium inline-flex items-center gap-1.5">
              <PremiumAuditTrail size={14} />
              Business Truth Engine
            </span>
            <MarketingInfoCardTitle>
              From software records to institutional truth
            </MarketingInfoCardTitle>
          </MarketingInfoCardHeader>
          <MarketingInfoCardBody>
            <p className="mi-card-copy">
              AFENDA is not conceived as an ERP of scattered features. It is designed as a{" "}
              <strong>Business Truth Engine</strong> — a system that captures complexity, governs
              meaning, preserves evidence, and allows organizations to evolve without erasing what
              matters.
            </p>
            <ul className="mi-card-list">
              {TRUTH_ENGINE_PILLARS.map((pillar) => (
                <li key={pillar.term}>
                  <strong>{pillar.term}</strong> — {pillar.def}
                </li>
              ))}
            </ul>
          </MarketingInfoCardBody>
        </AnimatedCard>
      </AnimatedL1>
    </MarketingInfoSection>
  );
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ABOUT_PAGE_JSON_LD_HTML }}
      />

      <MarketingInfoShell>
        <MarketingInfoHeader>
          <MarketingInfoKicker>
            <span className="inline-flex items-center gap-2">
              <PremiumDataFlow size={16} />
              About AFENDA
            </span>
          </MarketingInfoKicker>
          <MarketingInfoTitle>Built for truth. Engineered for accountability.</MarketingInfoTitle>
          <MarketingInfoDescription>
            AFENDA is designed for organizations that need more than transactional software. It
            preserves evidence, governs execution, and turns activity into durable institutional
            truth.
          </MarketingInfoDescription>
          <MarketingInfoMeta>
            <AnimatedBadge tone="primary">NexusCanon governance</AnimatedBadge>
            <AnimatedBadge tone="premium">Audit-first architecture</AnimatedBadge>
            <AnimatedBadge tone="premium">Dual-kernel control</AnimatedBadge>
          </MarketingInfoMeta>
        </MarketingInfoHeader>

        <MarketingInfoContent>
          <div className="mi-prose">
            <p>
              AFENDA is an enterprise platform structured on the{" "}
              <strong>NexusCanon governance doctrine</strong> and oriented by the{" "}
              <strong>AXIS architectural compass</strong>. Together, they create a disciplined
              operating environment for organizations that require clarity, accountability, and
              adaptive intelligence without sacrificing control.
            </p>
            <p>
              The platform is built on a simple conviction: enterprise systems should not merely
              record activity. They should establish what can be trusted, explain how it emerged,
              and preserve that truth over time.
            </p>
          </div>

          <hr className="mi-separator" />
          <GovernanceSection />

          <hr className="mi-separator" />
          <DisciplinesSection />

          <hr className="mi-separator" />
          <DualKernelSection />

          <hr className="mi-separator" />
          <TruthEngineSection />
        </MarketingInfoContent>

        <MarketingInfoFooter>
          <MarketingInfoCta>
            <MarketingInfoCtaTitle>Explore the trust surface</MarketingInfoCtaTitle>
            <MarketingInfoCtaBody>
              Review how AFENDA approaches governance, operational clarity, and institutional
              reliability.
            </MarketingInfoCtaBody>
            <MarketingInfoCtaRow>
              <Button asChild>
                <Link href="/status">System status</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Contact us</Link>
              </Button>
            </MarketingInfoCtaRow>
          </MarketingInfoCta>
        </MarketingInfoFooter>
      </MarketingInfoShell>
    </>
  );
}
