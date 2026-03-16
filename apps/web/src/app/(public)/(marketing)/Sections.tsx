"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Badge, Button } from "./_landing-ui";
import { ChevronRight, ArrowRight, Check, Play, Monitor, Clock, Mail } from "lucide-react";
import { AfendaLogo } from "./AfendaLogo";

// ─────────────────────────────────────────────────────────────────────────────
// TrustBar
// ─────────────────────────────────────────────────────────────────────────────

const trustLogos = [
  { name: "Deloitte", abbr: "DTT" },
  { name: "PwC", abbr: "PwC" },
  { name: "KPMG", abbr: "KPMG" },
  { name: "EY", abbr: "EY" },
  { name: "McKinsey", abbr: "McK" },
  { name: "Goldman", abbr: "GS" },
];

export function TrustBar() {
  return (
    <div className="relative z-10 border-t border-border bg-surface-25 py-8">
      <div className="mk-container">
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-16">
          <p className="shrink-0 font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            Trusted By Enterprise
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:justify-start md:gap-10">
            {trustLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center gap-1.5 opacity-40 transition-opacity hover:opacity-70"
              >
                <span className="font-mono text-xs font-semibold tracking-wider text-foreground-secondary">
                  {logo.abbr}
                </span>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2 md:ml-auto">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
              180+ JURISDICTIONS COVERED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EnterpriseCapabilities
// ─────────────────────────────────────────────────────────────────────────────

const capabilities = [
  "Multi-entity consolidation",
  "Real-time GL & sub-ledger sync",
  "Cryptographic audit trail",
  "AI anomaly detection",
  "IFRS / GAAP dual reporting",
  "XBRL-native export",
  "SOX Sec. 404 readiness",
  "FCPA automated monitoring",
  "180+ jurisdiction tax rules",
  "Graphile Worker event bus",
  "Idempotent command system",
  "Role-based multi-tenant RBAC",
];

export function EnterpriseCapabilities() {
  return (
    <section className="relative z-10 border-t border-border bg-surface-25 py-32">
      <div className="mk-container relative z-10">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <Badge
              variant="outline"
              className="mb-6 border-primary/30 bg-primary-soft px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-primary uppercase"
            >
              Full Feature Suite
            </Badge>
            <h2 className="mb-6 text-4xl leading-[1.1] font-medium tracking-tight text-foreground md:text-5xl">
              Enterprise-grade, <span className="text-muted-foreground">out of the box.</span>
            </h2>
            <p className="mb-8 text-lg leading-relaxed font-light text-foreground-secondary">
              Every capability your CFO, legal team, and Big-4 auditor will ask for — already built,
              tested, and enforced at the architectural level.
            </p>
            <Link href="#features">
              <Button variant="outline" className="group gap-2">
                View Full Capability Matrix
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {capabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-200/80 p-3"
              >
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground-secondary">{cap}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveDemoPreview
// ─────────────────────────────────────────────────────────────────────────────

const demoSteps = [
  { cmd: "afenda init --org acme-corp", out: "✓ Organisation created · org_id: 7f3a...e1c2" },
  {
    cmd: "afenda ledger:post --amount 145000 --cur USD",
    out: "✓ Journal entry JE-0042 posted · GL balanced",
  },
  {
    cmd: "afenda audit:verify --entity JE-0042",
    out: "✓ Cryptographic proof verified · hash: 9b1f...d4a7",
  },
  {
    cmd: "afenda compliance:check --standard IFRS-16",
    out: "✓ 14/14 assertions passed · compliant",
  },
];

export function LiveDemoPreview() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="relative z-10 border-t border-border py-32" id="demo">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
      </div>
      <div className="mk-container relative z-10 max-w-5xl">
        <div className="mb-16 text-center">
          <Badge
            variant="outline"
            className="mb-6 border-primary/30 bg-primary-soft px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-primary uppercase"
          >
            <Play className="mr-1.5 inline-block h-3 w-3" />
            Interactive Demo
          </Badge>
          <h2 className="mb-6 text-4xl leading-[1.1] font-medium tracking-tight text-foreground md:text-5xl">
            See the truth engine <span className="text-muted-foreground">in action.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed font-light text-foreground-secondary">
            Walk through a live AFENDA workflow — post a journal entry, verify its cryptographic
            proof, and run a compliance check in under 60 seconds.
          </p>
        </div>

        {/* Terminal Preview */}
        <div className="mb-12 overflow-hidden rounded-xl border border-border bg-surface-100">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 border-b border-border bg-surface-200 px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
            </div>
            <div className="ml-3 flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                AFENDA DEMO · SANDBOX
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-warning" />
              <span className="font-mono text-[10px] tracking-wider text-warning">
                COMING SOON
              </span>
            </div>
          </div>

          {/* Terminal body */}
          <div className="space-y-4 p-6 font-mono text-sm">
            {demoSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i, duration: 0.4 }}
              >
                <div className="flex items-center gap-2 text-foreground-tertiary">
                  <span className="text-primary select-none">$</span>
                  <span className="text-foreground-secondary">{step.cmd}</span>
                </div>
                <div className="mt-1 ml-5 text-xs text-success">{step.out}</div>
              </motion.div>
            ))}

            {/* Blinking cursor */}
            <div className="flex items-center gap-2 pt-2 text-foreground-tertiary">
              <span className="text-primary select-none">$</span>
              <span className="inline-block h-4 w-2 animate-pulse bg-primary/70" />
            </div>
          </div>
        </div>

        {/* Waitlist CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mx-auto max-w-lg text-center"
        >
          {submitted ? (
            <div className="flex items-center justify-center gap-3 rounded-lg border border-success bg-[var(--success-soft)] p-4">
              <Check className="h-5 w-5 text-success" />
              <span className="font-mono text-sm tracking-wide text-success">
                You&apos;re on the list — we&apos;ll notify you when the demo is live.
              </span>
            </div>
          ) : (
            <>
              <p className="mb-4 font-mono text-sm tracking-wide text-muted-foreground">
                Get notified when the interactive demo launches
              </p>
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface-200 px-4 py-2.5 transition-colors focus-within:border-primary">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  variant="default"
                  className="shrink-0 gap-2"
                  onClick={() => {
                    if (email.includes("@")) setSubmitted(true);
                  }}
                >
                  Notify Me
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────────────────────────────────────

export function CTA() {
  return (
    <section className="relative z-10 border-t border-border py-32" id="contact">
      <div className="mk-glow-center pointer-events-none absolute inset-0" />
      <div className="mk-container relative z-10 max-w-4xl text-center">
        <Badge
          variant="outline"
          className="mb-8 border-primary/30 bg-primary-soft px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-primary uppercase"
        >
          Join the Canon
        </Badge>
        <h2 className="mb-8 text-5xl leading-[1.05] font-medium tracking-tight text-foreground md:text-6xl lg:text-7xl">
          The era of{" "}
          <span className="bg-linear-to-r from-primary to-primary-muted bg-clip-text text-transparent">
            Financial Truth
          </span>{" "}
          begins here.
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed font-light text-foreground-secondary">
          Stop auditing the past. Start governing the future. AFENDA gives your enterprise a single,
          immutable truth across every entity, every currency, every jurisdiction.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="#demo">
            <Button variant="default" className="group gap-2 px-8 py-4 text-base">
              Request a Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="mailto:emerson@nexuscanon.com">
            <Button variant="outline" className="gap-2 px-8 py-4 text-base">
              Contact Sales
            </Button>
          </Link>
        </div>
        <p className="mt-8 font-mono text-xs tracking-widest text-muted-foreground">
          SOC 2 TYPE II · ISO 27001 · GDPR COMPLIANT · 99.99% SLA
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Compliance Engine", href: "#compliance" },
    { label: "Dashboard", href: "#dashboard" },
    { label: "Integrations", href: "#ecosystem" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "DPA", href: "/pdpa" },
    { label: "SLA", href: "/sla" },
  ],
  Developers: [
    { label: "API Reference", href: "#" },
    { label: "SDK", href: "#" },
    { label: "Webhooks", href: "#" },
    { label: "Status", href: "/status" },
  ],
};

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border bg-surface-50/90">
      <div className="mk-container py-12">
        <div className="mb-10 grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <AfendaLogo size="sm" variant="animated" align="start" />
            </div>
            <div className="mt-6 flex gap-3">
              {["𝕏", "in", "gh"].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s === "𝕏" ? "X (Twitter)" : s === "in" ? "LinkedIn" : "GitHub"}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground-secondary"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="mb-4 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {group}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => {
                  const isPending = link.href === "#";
                  const isExternal =
                    link.href.startsWith("mailto:") || link.href.startsWith("http");
                  const isAnchor = !isPending && link.href.startsWith("#");
                  const Comp = isExternal || isAnchor ? "a" : Link;

                  if (isPending) {
                    return (
                      <li key={link.label} className="flex items-center gap-2">
                        <span className="cursor-default text-sm text-foreground-quaternary">{link.label}</span>
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                          Soon
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={link.label}>
                      <Comp
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground-secondary"
                      >
                        {link.label}
                      </Comp>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            © 2026 AFENDA · ALL RIGHTS RESERVED
          </span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
