"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Badge, Button } from "./_landing-ui";
import {
  ChevronRight,
  ArrowRight,
  Check,
  Play,
  Monitor,
  Clock,
  Mail,
} from "lucide-react";
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
    <div className="border-t border-slate-900 bg-slate-950/50 py-8 relative z-10">
      <div className="mk-container">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <p className="text-[10px] font-mono text-slate-500 tracking-[0.25em] uppercase shrink-0">
            Trusted By Enterprise
          </p>
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 md:gap-10">
            {trustLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center gap-1.5 opacity-40 hover:opacity-70 transition-opacity"
              >
                <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">
                  {logo.abbr}
                </span>
              </div>
            ))}
          </div>
          <div className="md:ml-auto flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span className="text-[10px] font-mono text-slate-500 tracking-widest">
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
    <section className="py-32 bg-slate-950/50 border-t border-slate-900 relative z-10">
      <div className="mk-container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <Badge
              variant="outline"
              className="mb-6 border-teal-900/50 text-teal-400 font-mono tracking-[0.2em] uppercase text-[10px] bg-teal-950/20 px-3 py-1"
            >
              Full Feature Suite
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6 leading-[1.1]">
              Enterprise-grade, <span className="text-slate-500">out of the box.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed font-light mb-8">
              Every capability your CFO, legal team, and Big-4 auditor will ask for — already
              built, tested, and enforced at the architectural level.
            </p>
            <Link href="#features">
              <Button variant="outline" className="group gap-2">
                View Full Capability Matrix
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {capabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800/50"
              >
                <Check className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="text-sm text-slate-300">{cap}</span>
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
  { cmd: "afenda ledger:post --amount 145000 --cur USD", out: "✓ Journal entry JE-0042 posted · GL balanced" },
  { cmd: "afenda audit:verify --entity JE-0042", out: "✓ Cryptographic proof verified · hash: 9b1f...d4a7" },
  { cmd: "afenda compliance:check --standard IFRS-16", out: "✓ 14/14 assertions passed · compliant" },
];

export function LiveDemoPreview() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="py-32 border-t border-slate-900 relative z-10" id="demo">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/[0.03] blur-[100px]" />
      </div>
      <div className="mk-container max-w-5xl relative z-10">
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="mb-6 border-teal-900/50 text-teal-400 font-mono tracking-[0.2em] uppercase text-[10px] bg-teal-950/20 px-3 py-1"
          >
            <Play className="w-3 h-3 mr-1.5 inline-block" />
            Interactive Demo
          </Badge>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6 leading-[1.1]">
            See the truth engine{" "}
            <span className="text-slate-500">in action.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light leading-relaxed">
            Walk through a live AFENDA workflow — post a journal entry, verify its
            cryptographic proof, and run a compliance check in under 60 seconds.
          </p>
        </div>

        {/* Terminal Preview */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/80 overflow-hidden mb-12">
          {/* Chrome bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 bg-slate-900/40">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            </div>
            <div className="flex items-center gap-2 ml-3">
              <Monitor className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-500 tracking-widest">AFENDA DEMO · SANDBOX</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-500/70" />
              <span className="text-[10px] font-mono text-amber-500/70 tracking-wider">COMING SOON</span>
            </div>
          </div>

          {/* Terminal body */}
          <div className="p-6 font-mono text-sm space-y-4">
            {demoSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i, duration: 0.4 }}
              >
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-teal-600 select-none">$</span>
                  <span className="text-slate-200">{step.cmd}</span>
                </div>
                <div className="ml-5 mt-1 text-emerald-500/80 text-xs">{step.out}</div>
              </motion.div>
            ))}

            {/* Blinking cursor */}
            <div className="flex items-center gap-2 text-slate-400 pt-2">
              <span className="text-teal-600 select-none">$</span>
              <span className="inline-block w-2 h-4 bg-teal-500/70 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Waitlist CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="max-w-lg mx-auto text-center"
        >
          {submitted ? (
            <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-teal-950/30 border border-teal-900/40">
              <Check className="w-5 h-5 text-teal-400" />
              <span className="text-sm text-teal-300 font-mono tracking-wide">
                You&apos;re on the list — we&apos;ll notify you when the demo is live.
              </span>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 font-mono tracking-wide mb-4">
                Get notified when the interactive demo launches
              </p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900/60 focus-within:border-teal-800 transition-colors">
                  <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                  {/* shadcn-exempt: Marketing page uses isolated dark theme inputs */}
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none w-full font-mono"
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
                  <ArrowRight className="w-4 h-4" />
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
    <section className="py-32 border-t border-slate-900 relative z-10" id="contact">
      <div className="absolute inset-0 mk-glow-center pointer-events-none" />
      <div className="mk-container max-w-4xl relative z-10 text-center">
        <Badge
          variant="outline"
          className="mb-8 border-teal-900/50 text-teal-400 font-mono tracking-[0.2em] uppercase text-[10px] bg-teal-950/20 px-3 py-1"
        >
          Join the Canon
        </Badge>
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white tracking-tight mb-8 leading-[1.05]">
          The era of{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-600">
            Financial Truth
          </span>{" "}
          begins here.
        </h2>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto font-light leading-relaxed mb-12">
          Stop auditing the past. Start governing the future. AFENDA gives your enterprise a
          single, immutable truth across every entity, every currency, every jurisdiction.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="#demo">
            <Button variant="default" className="gap-2 group px-8 py-4 text-base">
              Request a Demo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="mailto:emerson@nexuscanon.com">
            <Button variant="outline" className="gap-2 px-8 py-4 text-base">
              Contact Sales
            </Button>
          </Link>
        </div>
        <p className="mt-8 text-xs font-mono text-slate-600 tracking-widest">
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
    <footer className="border-t border-slate-900 bg-slate-950/80 relative z-10">
      <div className="mk-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <AfendaLogo size="sm" variant="animated" align="start" />
            </div>
            <div className="flex gap-3 mt-6">
              {["𝕏", "in", "gh"].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s === "𝕏" ? "X (Twitter)" : s === "in" ? "LinkedIn" : "GitHub"}
                  className="w-8 h-8 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-xs hover:border-slate-600 hover:text-slate-300 transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase mb-4">
                {group}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => {
                  const isPending = link.href === "#";
                  const isExternal = link.href.startsWith("mailto:") || link.href.startsWith("http");
                  const isAnchor = !isPending && link.href.startsWith("#");
                  const Comp = isExternal || isAnchor ? "a" : Link;

                  if (isPending) {
                    return (
                      <li key={link.label} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 cursor-default">
                          {link.label}
                        </span>
                        <span className="text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded border border-slate-800 text-slate-600">
                          Soon
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={link.label}>
                      <Comp
                        href={link.href}
                        className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
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

        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs font-mono text-slate-600 tracking-widest">
            © 2026 AFENDA · ALL RIGHTS RESERVED
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-600 tracking-widest">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
