import type { Metadata } from "next";
import Link from "next/link";
import { Info, LayoutGrid, Cpu, Lightbulb } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@afenda/ui";

export const metadata: Metadata = {
  title: "About — AFENDA",
  description:
    "Learn about AFENDA and NexusCanon — our mission, vision, and commitment to audit-first enterprise operations.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — AFENDA",
    description:
      "Audit-first ERP powered by NexusCanon. Where numbers become canon.",
    type: "website",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="w-full space-y-8">
        <Card>
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-3xl">About AFENDA</CardTitle>
            <CardDescription className="text-lg">
              Audit-first ERP platform powered by NexusCanon
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="text-lg font-semibold">
                  About AFENDA &middot; NexusCanon &middot; AXIS
                </h3>
              </div>
              <Separator />
              <p className="text-muted-foreground leading-relaxed">
                AFENDA is an enterprise business platform structured on the{" "}
                <strong>NexusCanon governance model</strong> and the{" "}
                <strong>AXIS architectural compass</strong>, forming a unified
                operational environment for organizations that require clarity,
                accountability, and adaptive intelligence.
              </p>
              <div className="space-y-3 mt-4">
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-2">
                    NexusCanon — Governance Foundation
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Founded on two complementary principles:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 font-bold">
                        &bull;
                      </span>
                      <span>
                        <strong>Nexus — Business Chaos</strong>
                        <br />
                        The dynamic convergence of data, actors, and events
                        where real-world operations are inherently complex and
                        constantly shifting.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5 font-bold">
                        &bull;
                      </span>
                      <span>
                        <strong>Canon — The Truth That Does Not Change</strong>
                        <br />
                        The governing standard that validates, preserves, and
                        stabilizes operational records, ensuring consistency and
                        verifiable integrity over time.
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-2">
                    AXIS — The Life Compass
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    The structural orientation that aligns decisions, workflows,
                    and growth direction across the enterprise.
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm mb-2">
                    AFENDA — Unpredicted Morphology
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    The adaptive operational interface capable of evolving with
                    organizational needs without losing structural discipline.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <LayoutGrid
                  className="h-5 w-5 text-info"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">
                  Core Operational Disciplines
                </h3>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                The platform embeds structured enterprise practices designed to
                transform chaos into governed intelligence:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      CRUD-SAP Framework
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p className="mb-3">
                      A complete lifecycle discipline that governs information
                      from origination to foresight:
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li>&bull; <strong>C</strong>reate</li>
                      <li>&bull; <strong>R</strong>ead</li>
                      <li>&bull; <strong>U</strong>pdate</li>
                      <li>&bull; <strong>D</strong>elete</li>
                      <li>&bull; <strong>S</strong>earch</li>
                      <li>&bull; <strong>A</strong>udit</li>
                      <li>&bull; <strong>P</strong>redict</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      6W1H Traceability
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p className="mb-3">
                      Captured across every transaction to preserve contextual
                      evidence and accountability:
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li>&bull; <strong>Who</strong> — Actor identification</li>
                      <li>&bull; <strong>What</strong> — Action performed</li>
                      <li>&bull; <strong>When</strong> — Temporal context</li>
                      <li>&bull; <strong>Where</strong> — Location/system</li>
                      <li>&bull; <strong>Why</strong> — Business justification</li>
                      <li>&bull; <strong>Which</strong> — Resource affected</li>
                      <li>&bull; <strong>How</strong> — Method/process</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Evidence &amp; Audit Ledgering
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      Continuous verification and historical consistency with
                      immutable audit trails, 365-day retention, and
                      cryptographic validation of all operational records.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Process Canonization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      Standardized workflows that reduce ambiguity and
                      operational drift through validated business rules,
                      repeatable patterns, and governed execution paths.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu
                  className="h-5 w-5 text-success"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">
                  Dual-Kernel Architecture
                </h3>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground mb-4">
                NexusCanon operates on a{" "}
                <strong>Dual-Kernel model</strong> that enables organizations
                to balance speed and control, adaptability and verification,
                innovation and discipline within a single coherent system:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Cobalt — Execution Kernel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                      Focused on operations, tasks, field activity, and
                      real-time action.
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li>&bull; Operational workflows and task execution</li>
                      <li>&bull; Real-time data capture and processing</li>
                      <li>&bull; Field operations and mobile interfaces</li>
                      <li>&bull; Transaction processing and state changes</li>
                      <li>&bull; Performance-optimized for speed</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Quorum — Oversight Kernel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                      Focused on governance, validation, approvals, and
                      collective decision authority.
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li>&bull; Approval workflows and authorization</li>
                      <li>&bull; Compliance validation and policy enforcement</li>
                      <li>&bull; Audit trail verification and reporting</li>
                      <li>&bull; Multi-party consensus and sign-offs</li>
                      <li>&bull; Governance-optimized for control</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb
                  className="h-5 w-5 text-warning"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">Business Truth Engine</h3>
              </div>
              <Separator />
              <div className="rounded-lg border-l-4 border-primary bg-accent p-4">
                <p className="text-sm text-primary leading-relaxed mb-3">
                  AFENDA is not positioned as a traditional ERP. It is
                  engineered as a{" "}
                  <strong>Business Truth Engine</strong> — where chaos is
                  connected (<em>Nexus</em>), truth is preserved (
                  <em>Canon</em>), direction is aligned (<em>AXIS</em>), and
                  evolution remains possible (<em>AFENDA</em>).
                </p>
                <ul className="space-y-2 text-sm text-primary">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 font-bold">
                      &bull;
                    </span>
                    <span>
                      <strong>Chaos Connected</strong> — Dynamic convergence of
                      operational complexity
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 font-bold">
                      &bull;
                    </span>
                    <span>
                      <strong>Truth Preserved</strong> — Immutable governance
                      and verified integrity
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 font-bold">
                      &bull;
                    </span>
                    <span>
                      <strong>Direction Aligned</strong> — Strategic compass for
                      enterprise decisions
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 font-bold">
                      &bull;
                    </span>
                    <span>
                      <strong>Evolution Enabled</strong> — Adaptive morphology
                      without structural loss
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            <div className="flex flex-col gap-2 pt-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get Started
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
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
