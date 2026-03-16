import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Shield, Headphones, FileText, MapPin, Clock } from "lucide-react";

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

export const dynamic = "force-static";

const SUPPORT_EMAIL = "emerson@nexuscanon.com";
const LEGAL_EMAIL = "legal@nexuscanon.com";

interface ContactChannel {
  readonly id: string;
  readonly icon: "mail" | "shield" | "headphones" | "filetext";
  readonly title: string;
  readonly description: string;
  readonly email: string;
  readonly note: string;
  readonly lane: "primary" | "interactive" | "premium";
}

const CONTACT_CHANNELS = [
  {
    id: "general",
    icon: "mail",
    title: "General Inquiries",
    description:
      "Questions about AFENDA, capabilities, partnership opportunities, or platform demonstrations.",
    email: SUPPORT_EMAIL,
    note: "Response within 24-48 hours",
    lane: "primary",
  },
  {
    id: "support",
    icon: "headphones",
    title: "Technical Support",
    description:
      "Platform usage, integration guidance, account management, or technical troubleshooting.",
    email: SUPPORT_EMAIL,
    note: "Priority support for active deployments",
    lane: "interactive",
  },
  {
    id: "security",
    icon: "shield",
    title: "Security Reports",
    description:
      "Responsible disclosure of security vulnerabilities or platform security inquiries.",
    email: SUPPORT_EMAIL,
    note: "Subject: Security Vulnerability Report",
    lane: "premium",
  },
  {
    id: "pdpa",
    icon: "filetext",
    title: "Data Subject Requests",
    description: "Exercise rights under Malaysia's Personal Data Protection Act 2010 (PDPA).",
    email: LEGAL_EMAIL,
    note: "Subject: PDPA Data Subject Request",
    lane: "premium",
  },
] as const satisfies readonly ContactChannel[];

const ICON_MAP = {
  mail: Mail,
  shield: Shield,
  headphones: Headphones,
  filetext: FileText,
} as const;

export const metadata: Metadata = {
  title: "Contact — AFENDA | Business Truth Engine",
  description:
    "Connect with the AFENDA team for platform inquiries, technical support, security reports, or data subject requests.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — AFENDA | Business Truth Engine",
    description:
      "Get in touch with AFENDA — audit-first enterprise platform support and inquiries.",
    type: "website",
    url: "/contact",
  },
};

const CONTACT_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact — AFENDA",
  description:
    "Connect with the AFENDA team for platform inquiries, technical support, security reports, or data subject requests.",
  url: "https://afenda.com/contact",
} as const;

const CONTACT_PAGE_JSON_LD_HTML = JSON.stringify(CONTACT_PAGE_JSON_LD).replace(/</g, "\\u003c");

function ChannelsSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>How to reach us</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          Choose the appropriate channel based on your inquiry type. We respond to all messages
          during business hours.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedGrid columns={2}>
          {CONTACT_CHANNELS.map((channel) => {
            const Icon = ICON_MAP[channel.icon];
            return (
              <AnimatedGridItem key={channel.id}>
                <AnimatedCard>
                  <MarketingInfoCardHeader>
                    <span className={`mi-card-kicker mi-card-kicker--${channel.lane}`}>
                      <Icon className="mr-1.5 inline-block h-4 w-4 align-text-bottom" aria-hidden />
                      {channel.id.charAt(0).toUpperCase() + channel.id.slice(1)}
                    </span>
                    <MarketingInfoCardTitle>{channel.title}</MarketingInfoCardTitle>
                  </MarketingInfoCardHeader>
                  <MarketingInfoCardBody>
                    <p className="mi-card-copy">{channel.description}</p>
                    <ul className="mi-card-list">
                      <li>
                        <strong>Email:</strong>{" "}
                        <a
                          href={`mailto:${channel.email}`}
                          className="text-primary hover:underline"
                        >
                          {channel.email}
                        </a>
                      </li>
                      <li>{channel.note}</li>
                    </ul>
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

function OrganizationInfoSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Organization details</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          Primary contact information and operational hours.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedL1>
        <AnimatedGrid columns={2}>
          <AnimatedGridItem>
            <AnimatedCard tone="muted">
              <MarketingInfoCardHeader>
                <span className="mi-card-kicker mi-card-kicker--primary">
                  <Clock className="mr-1.5 inline-block h-4 w-4 align-text-bottom" aria-hidden />
                  Hours
                </span>
                <MarketingInfoCardTitle>Business Hours</MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <ul className="mi-card-list">
                  <li>
                    <strong>Standard Support:</strong> Monday – Friday, 9:00 AM – 6:00 PM (GMT+8)
                  </li>
                  <li>
                    <strong>Security Issues:</strong> 24/7 monitoring
                  </li>
                </ul>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>

          <AnimatedGridItem>
            <AnimatedCard tone="muted">
              <MarketingInfoCardHeader>
                <span className="mi-card-kicker mi-card-kicker--interactive">
                  <MapPin className="mr-1.5 inline-block h-4 w-4 align-text-bottom" aria-hidden />
                  Region
                </span>
                <MarketingInfoCardTitle>Primary Infrastructure</MarketingInfoCardTitle>
              </MarketingInfoCardHeader>
              <MarketingInfoCardBody>
                <ul className="mi-card-list">
                  <li>
                    <strong>Region:</strong> Singapore (ap-southeast-1)
                  </li>
                  <li>
                    <strong>Compliance:</strong> PDPA 2010 (Malaysia)
                  </li>
                </ul>
              </MarketingInfoCardBody>
            </AnimatedCard>
          </AnimatedGridItem>
        </AnimatedGrid>
      </AnimatedL1>
    </MarketingInfoSection>
  );
}

function ResourcesSection() {
  return (
    <MarketingInfoSection>
      <MarketingInfoSectionHeader>
        <MarketingInfoSectionTitle>Before you contact us</MarketingInfoSectionTitle>
        <MarketingInfoSectionDescription>
          Check these resources — they may answer your question immediately.
        </MarketingInfoSectionDescription>
      </MarketingInfoSectionHeader>

      <AnimatedCard tone="muted">
        <MarketingInfoCardBody>
          <ul className="mi-card-list">
            <li>
              <Link href="/about" className="text-primary hover:underline">
                <strong>About</strong>
              </Link>{" "}
              — Platform philosophy and architectural doctrine
            </li>
            <li>
              <Link href="/status" className="text-primary hover:underline">
                <strong>System Status</strong>
              </Link>{" "}
              — Real-time service health and uptime monitoring
            </li>
            <li>
              <Link href="/sla" className="text-primary hover:underline">
                <strong>Service Level Agreement</strong>
              </Link>{" "}
              — Uptime commitments and support response times
            </li>
            <li>
              <Link href="/privacy" className="text-primary hover:underline">
                <strong>Privacy Policy</strong>
              </Link>{" "}
              — Data protection and PDPA compliance
            </li>
            <li>
              <Link href="/terms" className="text-primary hover:underline">
                <strong>Terms of Service</strong>
              </Link>{" "}
              — Platform usage terms and conditions
            </li>
          </ul>
        </MarketingInfoCardBody>
      </AnimatedCard>
    </MarketingInfoSection>
  );
}

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: CONTACT_PAGE_JSON_LD_HTML }}
      />

      <MarketingInfoShell>
        <MarketingInfoHeader>
          <MarketingInfoKicker>Get in Touch</MarketingInfoKicker>
          <MarketingInfoTitle>Contact AFENDA</MarketingInfoTitle>
          <MarketingInfoDescription>
            Connect with our team for platform inquiries, technical support, security reports, or
            data subject requests. We respond during business hours and monitor security issues
            24/7.
          </MarketingInfoDescription>
          <MarketingInfoMeta>
            <AnimatedBadge tone="primary">Response within 24-48 hours</AnimatedBadge>
            <AnimatedBadge tone="premium">Security monitoring 24/7</AnimatedBadge>
          </MarketingInfoMeta>
        </MarketingInfoHeader>

        <MarketingInfoContent>
          <ChannelsSection />

          <hr className="mi-separator" />
          <OrganizationInfoSection />

          <hr className="mi-separator" />
          <ResourcesSection />
        </MarketingInfoContent>

        <MarketingInfoFooter>
          <MarketingInfoCta>
            <MarketingInfoCtaTitle>Explore the business truth engine</MarketingInfoCtaTitle>
            <MarketingInfoCtaBody>
              Learn more about AFENDA's governance doctrine, architectural discipline, and
              audit-first approach to enterprise operations.
            </MarketingInfoCtaBody>
            <MarketingInfoCtaRow>
              <Button asChild>
                <Link href="/about">About AFENDA</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/status">System Status</Link>
              </Button>
            </MarketingInfoCtaRow>
          </MarketingInfoCta>
        </MarketingInfoFooter>
      </MarketingInfoShell>
    </>
  );
}
