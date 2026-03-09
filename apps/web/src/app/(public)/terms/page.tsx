import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Cpu, Gauge } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";

export const revalidate = 2592000; // monthly ISR

export const metadata: Metadata = {
  title: "Terms of Service — AFENDA",
  description:
    "Terms of service, acceptable use policy, and enterprise SLA for AFENDA.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — AFENDA",
    description:
      "Enterprise SLA: 99.95% uptime, RTO < 30 min, RPO < 1 min.",
    type: "website",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="w-full">
        <Card>
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <CardDescription>
              Enterprise-grade SLA powered by NexusCanon Infrastructure Fabric.
            </CardDescription>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" aria-hidden="true" /> 99.95%
                Uptime
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Cpu className="h-3 w-3" aria-hidden="true" /> NexusCanon
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Gauge className="h-3 w-3" aria-hidden="true" /> Elastic
                0.25-8 CU
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-8">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 text-sm">
                <h3 className="font-semibold">Service Access</h3>
                <p className="text-muted-foreground mt-2">
                  Access to AFENDA is provided under your organization&apos;s
                  subscription or order form and subject to these terms.
                </p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <h3 className="font-semibold">Reliability Commitments</h3>
                <p className="text-muted-foreground mt-2">
                  We operate with defined availability and recovery targets,
                  backed by tested backup and restore procedures.
                </p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <h3 className="font-semibold">Responsible Use</h3>
                <p className="text-muted-foreground mt-2">
                  Customers must use the platform lawfully, protect credentials,
                  and avoid actions that degrade service quality.
                </p>
              </div>
            </section>

            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold">Acceptance of Terms</h3>
                <p className="text-muted-foreground">
                  By accessing or using AFENDA, you agree to these terms. AFENDA
                  is an audit-first ERP platform designed for secure, auditable
                  operations.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">Service Description</h3>
                <p className="text-muted-foreground">
                  AFENDA provides audit-first ERP powered by NexusCanon
                  Infrastructure Fabric:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>
                    <strong>Database Engine:</strong> NexusCanon with PostgreSQL
                    compatibility
                  </li>
                  <li>
                    <strong>Elastic Compute:</strong> Auto-scaling (0.25-8 CU)
                    with scale-to-zero
                  </li>
                  <li>
                    <strong>Backup &amp; Recovery:</strong> Hourly snapshots with
                    30-day PITR
                  </li>
                  <li>
                    <strong>High Availability:</strong> Multi-AZ deployment with
                    automatic failover
                  </li>
                  <li>
                    <strong>Primary Region:</strong> ap-southeast-1 (Singapore)
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold">
                  Service Level Agreement (SLA)
                </h3>
                <p className="text-muted-foreground">
                  NexusCanon Infrastructure Fabric provides enterprise-grade
                  service guarantees:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>
                    <strong>Uptime Guarantee:</strong> 99.95% monthly
                    availability
                  </li>
                  <li>
                    <strong>Recovery Time Objective (RTO):</strong> &lt; 30
                    minutes
                  </li>
                  <li>
                    <strong>Recovery Point Objective (RPO):</strong> &lt; 1
                    minute
                  </li>
                  <li>
                    <strong>Data Durability:</strong> 99.999999999% (11 nines)
                  </li>
                  <li>
                    <strong>Compute Scaling:</strong> &lt; 10 seconds to scale
                    up/down
                  </li>
                  <li>
                    <strong>Cold Start:</strong> &lt; 500ms from suspended state
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold">Acceptable Use Policy</h3>
                <p className="text-muted-foreground">You agree not to:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit malware or harmful code</li>
                  <li>
                    Attempt to gain unauthorized access to systems
                  </li>
                  <li>
                    Interfere with service availability for other users
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold">Customer Responsibilities</h3>
                <p className="text-muted-foreground">
                  You are responsible for account security, appropriate access
                  provisioning, and the legality of content and workflows
                  executed on the platform.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">
                  Data Ownership &amp; Backup
                </h3>
                <p className="text-muted-foreground">
                  You retain full ownership of all data you submit to AFENDA.
                  NexusCanon provides:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>
                    <strong>Automated Backups:</strong> Hourly snapshots with
                    continuous WAL archiving
                  </li>
                  <li>
                    <strong>Point-in-Time Recovery:</strong> 30-day window with
                    second-level granularity
                  </li>
                  <li>
                    <strong>Data Export:</strong> Standard PostgreSQL dump format
                    available anytime
                  </li>
                  <li>
                    <strong>Secure Deletion:</strong> Cryptographic erasure
                    within 30 days of account closure
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold">
                  Security &amp; Compliance
                </h3>
                <p className="text-muted-foreground">
                  NexusCanon Infrastructure Fabric maintains:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>
                    <strong>SOC 2 Type II:</strong> Security, availability,
                    confidentiality
                  </li>
                  <li>
                    <strong>HIPAA:</strong> Business Associate Agreement (BAA)
                    available
                  </li>
                  <li>
                    <strong>GDPR:</strong> Full EU data protection compliance
                  </li>
                  <li>
                    <strong>CCPA:</strong> California Consumer Privacy Act
                    compliance
                  </li>
                  <li>
                    <strong>ISO 27001:</strong> Information security management
                    (in progress)
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold">Limitation of Liability</h3>
                <p className="text-muted-foreground">
                  In no event shall AFENDA be liable for any indirect,
                  incidental, special, consequential, or punitive damages. Our
                  total liability is limited to the fees paid in the 12 months
                  preceding the claim.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">Termination</h3>
                <p className="text-muted-foreground">
                  You may terminate your account at any time. Upon termination,
                  your data will be retained for 30 days before permanent
                  deletion.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">Governing Law</h3>
                <p className="text-muted-foreground">
                  These terms are governed by the laws of Singapore
                  (ap-southeast-1). Disputes will be resolved through
                  arbitration.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">
                  Support &amp; Communication
                </h3>
                <p className="text-muted-foreground">
                  For support, contact{" "}
                  <a
                    className="underline"
                    href="mailto:legal@nexuscanon.com"
                  >
                    legal@nexuscanon.com
                  </a>
                  .
                </p>
              </section>
            </div>

            <div className="flex flex-col gap-2">
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
                href="/pdpa"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                PDPA Compliance
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
