import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  BookOpen,
  Database,
  FileText,
  Lock,
  Scale,
  Shield,
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
  MarketingInfoCard,
  MarketingInfoCardHeader,
  MarketingInfoCardTitle,
  MarketingInfoCardBody,
  MarketingInfoBadge,
  MarketingInfoL1,
  MarketingInfoGrid,
} from "../_components/marketing-info-primitives";

export const dynamic = "force-static";

interface Principle {
  readonly num: number;
  readonly title: string;
  readonly ref: string;
  readonly items: readonly string[];
  readonly impl: string;
}

interface DataSubjectRight {
  readonly title: string;
  readonly desc: string;
  readonly legal: string;
}

interface SecuritySafeguard {
  readonly label: string;
  readonly desc: string;
}

const PRINCIPLES = [
  {
    num: 1,
    title: "General Principle",
    ref: "Section 5, Schedule 1 Part I",
    items: [
      "Data subject has given consent (Section 6(1))",
      "Processing is necessary for contract performance",
      "Processing is required by law",
      "Processing protects vital interests of data subject",
    ],
    impl: "Explicit consent obtained during registration with clear opt-in mechanisms.",
  },
  {
    num: 2,
    title: "Notice & Choice Principle",
    ref: "Section 7, Schedule 1 Part II",
    items: [
      "Purpose of data collection and processing",
      "Source of personal data if not from data subject",
      "Right to access and correct personal data",
      "Identity of data user and contact information",
    ],
    impl: "Comprehensive privacy notice displayed at registration.",
  },
  {
    num: 3,
    title: "Disclosure Principle",
    ref: "Section 8, Schedule 1 Part III",
    items: [
      "Disclosure is for the purpose it was collected",
      "Data subject has consented to disclosure",
      "Disclosure is required by law or court order",
    ],
    impl: "Strict disclosure controls. Third-party sharing only with explicit consent or legal requirement.",
  },
  {
    num: 4,
    title: "Security Principle",
    ref: "Section 9, Schedule 1 Part IV",
    items: [
      "Practical security measures against loss, misuse, unauthorized access",
      "Protection against unauthorized modification or destruction",
      "Appropriate technical and organizational measures",
    ],
    impl: "AES-256-GCM encryption, TLS 1.3, hardware-backed key management, 365-day immutable audit logs.",
  },
  {
    num: 5,
    title: "Retention Principle",
    ref: "Section 10, Schedule 1 Part V",
    items: [
      "Retention only for fulfillment of purpose",
      "Retention for legal or business purposes",
      "Secure destruction when no longer needed",
    ],
    impl: "Deleted data purged within 30 days using cryptographic erasure. Audit logs retained 365 days.",
  },
  {
    num: 6,
    title: "Data Integrity Principle",
    ref: "Section 11, Schedule 1 Part VI",
    items: [
      "Accurate, complete, and not misleading",
      "Updated where necessary",
      "Appropriate for the purpose of use",
    ],
    impl: "User-accessible profile management. Automated data validation. Regular quality audits.",
  },
  {
    num: 7,
    title: "Access Principle",
    ref: "Section 12, Schedule 1 Part VII",
    items: [
      "Request access to personal data (Section 30)",
      "Request correction of personal data (Section 31)",
      "Receive response within 21 days (Section 32)",
      "Withdraw consent (Section 38)",
    ],
    impl: "Self-service data access portal. Correction requests processed within 14 days.",
  },
] as const satisfies readonly Principle[];

const DATA_SUBJECT_RIGHTS = [
  {
    title: "Right to Access (Section 30)",
    desc: "You have the right to request access to your personal data held by us. We will respond within 21 days as required by law.",
    legal: 'Section 30(1) — "A data subject may make a data access request to a data user."',
  },
  {
    title: "Right to Correction (Section 31)",
    desc: "You have the right to request correction of inaccurate, incomplete, misleading, or not up-to-date personal data.",
    legal: 'Section 31(1) — "A data subject may request a data user to correct his personal data."',
  },
  {
    title: "Right to Withdraw Consent (Section 38)",
    desc: "You may withdraw your consent for processing of personal data at any time, subject to legal or contractual restrictions.",
    legal: 'Section 38 — "A data subject may, by notice in writing, withdraw his consent."',
  },
  {
    title: "Right to Prevent Processing (Section 40)",
    desc: "You may request to prevent processing likely to cause damage or distress to you or another person.",
    legal: 'Section 40 — "A data subject may, at any time by notice in writing to a data user, require the data user to cease processing."',
  },
] as const satisfies readonly DataSubjectRight[];

const SECURITY_SAFEGUARDS = [
  {
    label: "Physical Security",
    desc: "Multi-AZ data centers with 24/7 monitoring, biometric access controls, and environmental safeguards",
  },
  {
    label: "Technical Security",
    desc: "AES-256-GCM encryption at rest, TLS 1.3 in transit, hardware-backed key management with 90-day rotation",
  },
  {
    label: "Administrative Security",
    desc: "Zero-trust RBAC, background checks for personnel, security awareness training, incident response procedures",
  },
  {
    label: "Audit & Monitoring",
    desc: "365-day immutable audit logs, real-time security monitoring, automated threat detection",
  },
] as const satisfies readonly SecuritySafeguard[];

export const metadata: Metadata = {
  title: "PDPA Compliance — AFENDA | Business Truth Engine",
  description:
    "Full compliance with Malaysia's Personal Data Protection Act 2010 (Act 709). Seven Data Protection Principles, registered Data User, comprehensive security safeguards.",
  alternates: { canonical: "/pdpa" },
  openGraph: {
    title: "PDPA Compliance — AFENDA",
    description:
      "Full compliance with Malaysia's Personal Data Protection Act 2010 (Act 709).",
    type: "website",
    url: "/pdpa",
  },
};

function ComplianceStatementSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoCard>
        <MarketingInfoCardHeader>
          <MarketingInfoCardTitle>PDPA Compliance Statement</MarketingInfoCardTitle>
        </MarketingInfoCardHeader>
        <MarketingInfoCardBody>
          <p className="mi-card-copy">
            AFENDA is committed to full compliance with the Personal Data
            Protection Act 2010 (Act 709) of Malaysia. We process personal data
            in accordance with the seven (7) Data Protection Principles and
            maintain registration with the Personal Data Protection Commissioner
            of Malaysia.
          </p>
        </MarketingInfoCardBody>
      </MarketingInfoCard>
    </MarketingInfoSection>
  );
}

function PrinciplesSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <BookOpen
            className="inline-block h-5 w-5 text-primary mr-2 align-middle"
            aria-hidden
          />
          Seven Data Protection Principles
        </MarketingInfoSectionTitle>
      </MarketingInfoSectionHeader>
      <MarketingInfoL1>
        <MarketingInfoGrid columns={1}>
          {PRINCIPLES.map((p) => (
            <MarketingInfoCard asChild key={p.num}>
              <li>
                <MarketingInfoCardHeader>
                  <MarketingInfoCardTitle>{`${p.num}. ${p.title}`}</MarketingInfoCardTitle>
                  <p className="mi-card-meta mi-card-meta--ref">{p.ref}</p>
                </MarketingInfoCardHeader>
                <MarketingInfoCardBody>
                  <ul className="mi-card-list">
                    {p.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mi-card-copy">
                    <strong>Our implementation:</strong> {p.impl}
                  </p>
                </MarketingInfoCardBody>
              </li>
            </MarketingInfoCard>
          ))}
        </MarketingInfoGrid>
      </MarketingInfoL1>
    </MarketingInfoSection>
  );
}

function DataSubjectRightsSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <Database
            className="inline-block h-5 w-5 text-primary mr-2 align-middle"
            aria-hidden
          />
          Data Subject Rights Under PDPA 2010
        </MarketingInfoSectionTitle>
      </MarketingInfoSectionHeader>
      <ul className="mi-grid mi-grid--1 mi-list">
        {DATA_SUBJECT_RIGHTS.map((r) => (
          <MarketingInfoCard asChild key={r.title}>
            <li>
              <MarketingInfoCardHeader>
                <MarketingInfoCardTitle>{r.title}</MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <p className="mi-card-copy">{r.desc}</p>
                <p className="mi-card-meta mi-card-meta--ref">
                  <strong>Legal reference:</strong> {r.legal}
                </p>
              </MarketingInfoCardBody>
            </li>
          </MarketingInfoCard>
        ))}
      </ul>
    </MarketingInfoSection>
  );
}

function SecuritySafeguardsSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <Award
            className="inline-block h-5 w-5 text-warning mr-2 align-middle"
            aria-hidden
          />
          Security Safeguards (Section 9 Compliance)
        </MarketingInfoSectionTitle>
      </MarketingInfoSectionHeader>
      <MarketingInfoCard>
        <MarketingInfoCardBody>
          <p className="mi-card-copy">
            In compliance with Section 9 of the PDPA 2010, we implement
            comprehensive security safeguards:
          </p>
          <ul className="mi-card-list">
            {SECURITY_SAFEGUARDS.map((s) => (
              <li key={s.label}>
                <strong>{s.label}:</strong> {s.desc}
              </li>
            ))}
          </ul>
        </MarketingInfoCardBody>
      </MarketingInfoCard>
    </MarketingInfoSection>
  );
}

function DataUserRegistrationSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <Lock
            className="inline-block h-5 w-5 text-info mr-2 align-middle"
            aria-hidden
          />
          Data User Registration (Section 16)
        </MarketingInfoSectionTitle>
      </MarketingInfoSectionHeader>
      <MarketingInfoCard>
        <MarketingInfoCardBody>
          <p className="mi-card-copy">
            AFENDA is registered as a Data User with the Personal Data Protection
            Commissioner of Malaysia in compliance with Section 16 of the PDPA 2010.
          </p>
          <div className="mi-card-notice">
            <ul className="mi-card-list">
              <li>Data User: AFENDA (NexusCanon Infrastructure)</li>
              <li>Registration Status: Compliant with Section 16</li>
              <li>Data Protection Officer: Available upon request</li>
              <li>Contact: legal@nexuscanon.com</li>
            </ul>
          </div>
        </MarketingInfoCardBody>
      </MarketingInfoCard>
    </MarketingInfoSection>
  );
}

function CrossBorderSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>
          <AlertCircle
            className="inline-block h-5 w-5 text-destructive mr-2 align-middle"
            aria-hidden
          />
          Cross-Border Data Transfer (Section 129)
        </MarketingInfoSectionTitle>
      </MarketingInfoSectionHeader>
      <MarketingInfoCard>
        <MarketingInfoCardBody>
          <p className="mi-card-copy">
            Personal data may be transferred outside Malaysia only in compliance
            with Section 129 of the PDPA 2010:
          </p>
          <ul className="mi-card-list">
            <li>Transfer to countries with adequate data protection standards</li>
            <li>Transfer with data subject consent</li>
            <li>Transfer necessary for contract performance</li>
            <li>Transfer with appropriate safeguards (Standard Contractual Clauses)</li>
          </ul>
          <p className="mi-card-copy">
            <strong>Our implementation:</strong> Primary data residency in Singapore
            (ap-southeast-1). Cross-border transfers governed by Standard
            Contractual Clauses.
          </p>
        </MarketingInfoCardBody>
      </MarketingInfoCard>
    </MarketingInfoSection>
  );
}

function ExerciseRightsSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Exercise Your Rights</MarketingInfoSectionTitle>
      </MarketingInfoSectionHeader>
      <MarketingInfoCard>
        <MarketingInfoCardBody>
          <p className="mi-card-copy">
            To exercise your rights under the PDPA 2010 or for any data protection
            inquiries:
          </p>
          <ul className="mi-card-list">
            <li>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:legal@nexuscanon.com"
                className="text-info hover:underline"
              >
              legal@nexuscanon.com
            </a>
          </li>
          <li><strong>Subject line:</strong> PDPA Data Subject Request</li>
          <li>
            <strong>Response time:</strong> Within 21 days as required by Section 32
          </li>
        </ul>
        </MarketingInfoCardBody>
      </MarketingInfoCard>
    </MarketingInfoSection>
  );
}

export default function PDPAPage() {
  return (
    <MarketingInfoShell width="narrow">
      <MarketingInfoHeader>
        <MarketingInfoKicker>Legal — Last Updated March 16, 2026</MarketingInfoKicker>
        <MarketingInfoTitle>Personal Data Protection Act (PDPA) Compliance</MarketingInfoTitle>
        <MarketingInfoDescription>
          Full compliance with Malaysia&apos;s Personal Data Protection Act 2010 (Act 709) powered by NexusCanon Infrastructure Fabric.
        </MarketingInfoDescription>
        <MarketingInfoMeta>
          <MarketingInfoBadge tone="primary">
            <Scale className="h-3 w-3 mr-1.5" aria-hidden />
            PDPA Compliant
          </MarketingInfoBadge>
          <MarketingInfoBadge tone="premium">
            <BookOpen className="h-3 w-3 mr-1.5" aria-hidden />
            7 Principles
          </MarketingInfoBadge>
          <MarketingInfoBadge tone="premium">
            <Award className="h-3 w-3 mr-1.5" aria-hidden />
            Registered Data User
          </MarketingInfoBadge>
        </MarketingInfoMeta>
      </MarketingInfoHeader>

      <MarketingInfoContent>
        <ComplianceStatementSection />

        <hr className="mi-separator" />

        <PrinciplesSection />

        <hr className="mi-separator" />

        <DataSubjectRightsSection />

        <hr className="mi-separator" />

        <SecuritySafeguardsSection />

        <hr className="mi-separator" />

        <DataUserRegistrationSection />

        <hr className="mi-separator" />

        <CrossBorderSection />

        <hr className="mi-separator" />

        <ExerciseRightsSection />
      </MarketingInfoContent>

      <MarketingInfoFooter>
        <MarketingInfoCta>
          <MarketingInfoCtaTitle>Related policies</MarketingInfoCtaTitle>
          <MarketingInfoCtaBody>
            For privacy, cookies, SLA, and terms, see the links below.
          </MarketingInfoCtaBody>
          <MarketingInfoCtaRow>
            <Button asChild size="sm">
              <Link href="/privacy">Privacy Policy</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/terms">Terms of Service</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/sla">Service Level Agreement</Link>
            </Button>
          </MarketingInfoCtaRow>
        </MarketingInfoCta>
      </MarketingInfoFooter>
    </MarketingInfoShell>
  );
}
