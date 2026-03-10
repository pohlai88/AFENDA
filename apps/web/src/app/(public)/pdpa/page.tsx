import type { Metadata } from "next";
import Link from "next/link";
import {
  Scale,
  Shield,
  Lock,
  Check,
  FileText,
  BookOpen,
  Award,
  Database,
  AlertCircle,
} from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@afenda/ui";

export const revalidate = 2592000; // monthly ISR

export const metadata: Metadata = {
  title: "PDPA Compliance — AFENDA",
  description:
    "Personal Data Protection Act 2010 (Act 709) compliance for AFENDA. Comprehensive data protection aligned with Malaysian law.",
  alternates: { canonical: "/pdpa" },
  openGraph: {
    title: "PDPA Compliance — AFENDA",
    description:
      "Full compliance with Malaysia's Personal Data Protection Act 2010 (Act 709).",
    type: "website",
    url: "/pdpa",
  },
};

export default function PDPAPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16">
      <div className="w-full">
        <Card>
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl">
              Personal Data Protection Act (PDPA) Compliance
            </CardTitle>
            <CardDescription>
              Full compliance with Malaysia&apos;s Personal Data Protection Act
              2010 (Act 709) powered by NexusCanon Infrastructure Fabric.
            </CardDescription>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Scale className="h-3 w-3" aria-hidden="true" /> PDPA 2010
                (Act 709)
              </Badge>
              <Badge variant="outline" className="gap-1">
                <BookOpen className="h-3 w-3" aria-hidden="true" /> 7 Data
                Protection Principles
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" aria-hidden="true" /> Security
                Safeguards
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Award className="h-3 w-3" aria-hidden="true" /> Registered
                Data User
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Overview */}
            <section className="space-y-4">
              <div className="rounded-lg border-l-4 border-info bg-accent p-4">
                <div className="flex items-start gap-3">
                  <FileText
                    className="h-5 w-5 text-info mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-info">
                      PDPA Compliance Statement
                    </h3>
                    <p className="text-sm text-info">
                      AFENDA is committed to full compliance with the Personal
                      Data Protection Act 2010 (Act 709) of Malaysia. We process
                      personal data in accordance with the seven (7) Data
                      Protection Principles and maintain registration with the
                      Personal Data Protection Commissioner of Malaysia.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Seven Data Protection Principles */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">
                  Seven Data Protection Principles
                </h3>
              </div>
              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                {[
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
                ].map((p) => (
                  <Card key={p.num}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Check
                          className="h-4 w-4 text-success"
                          aria-hidden="true"
                        />
                        {p.num}. {p.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{p.ref}</p>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                      <ul className="list-inside list-disc space-y-1 text-xs">
                        {p.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p className="text-xs font-semibold mt-2">
                        Our Implementation:
                      </p>
                      <p className="text-xs">{p.impl}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Data Subject Rights */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Database
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">
                  Data Subject Rights Under PDPA 2010
                </h3>
              </div>
              <Separator />

              <div className="space-y-3 text-sm">
                {[
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
                ].map((r) => (
                  <div key={r.title} className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-2">{r.title}</h4>
                    <p className="text-muted-foreground mb-2">{r.desc}</p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Legal Reference:</strong> {r.legal}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Security Safeguards */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Award
                  className="h-5 w-5 text-warning"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">
                  Security Safeguards (Section 9 Compliance)
                </h3>
              </div>
              <Separator />

              <div className="rounded-lg border p-4 text-sm">
                <p className="text-muted-foreground mb-3">
                  In compliance with Section 9 of the PDPA 2010, we implement
                  comprehensive security safeguards:
                </p>
                <ul className="space-y-2">
                  {[
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
                  ].map((s) => (
                    <li key={s.label} className="flex items-start gap-2">
                      <Check
                        className="h-4 w-4 text-success mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        <strong>{s.label}:</strong> {s.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Data User Registration */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock
                  className="h-5 w-5 text-info"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">
                  Data User Registration (Section 16)
                </h3>
              </div>
              <Separator />

              <div className="rounded-lg border p-4 text-sm">
                <p className="text-muted-foreground mb-2">
                  AFENDA is registered as a Data User with the Personal Data
                  Protection Commissioner of Malaysia in compliance with
                  Section 16 of the PDPA 2010.
                </p>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-semibold mb-1">
                    Registration Details:
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>&bull; Data User: AFENDA (NexusCanon Infrastructure)</li>
                    <li>&bull; Registration Status: Compliant with Section 16</li>
                    <li>
                      &bull; Data Protection Officer: Available upon request
                    </li>
                    <li>&bull; Contact: legal@nexuscanon.com</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Cross-Border Data Transfer */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle
                  className="h-5 w-5 text-destructive"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">
                  Cross-Border Data Transfer (Section 129)
                </h3>
              </div>
              <Separator />

              <div className="rounded-lg border p-4 text-sm">
                <p className="text-muted-foreground mb-3">
                  Personal data may be transferred outside Malaysia only in
                  compliance with Section 129 of the PDPA 2010:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-info mt-0.5">&bull;</span>
                    <span>
                      Transfer to countries with adequate data protection
                      standards
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-info mt-0.5">&bull;</span>
                    <span>Transfer with data subject consent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-info mt-0.5">&bull;</span>
                    <span>
                      Transfer necessary for contract performance
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-info mt-0.5">&bull;</span>
                    <span>
                      Transfer with appropriate safeguards (Standard
                      Contractual Clauses)
                    </span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Our Implementation:</strong> Primary data residency in
                  Singapore (ap-southeast-1). Cross-border transfers governed by
                  Standard Contractual Clauses.
                </p>
              </div>
            </section>

            {/* Exercise Your Rights */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Exercise Your Rights</h3>
              <Separator />
              <div className="rounded-lg border p-4 text-sm">
                <p className="text-muted-foreground mb-3">
                  To exercise your rights under the PDPA 2010 or for any data
                  protection inquiries:
                </p>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    <strong>Email:</strong>{" "}
                    <a
                      href="mailto:legal@nexuscanon.com"
                      className="underline"
                    >
                      legal@nexuscanon.com
                    </a>
                  </p>
                  <p>
                    <strong>Subject Line:</strong> PDPA Data Subject Request
                  </p>
                  <p>
                    <strong>Response Time:</strong> Within 21 days as required by
                    Section 32
                  </p>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-2 pt-4">
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href="/cookie-policy"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Cookie Policy
              </Link>
              <Link
                href="/sla"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                SLA
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Terms of Service
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
