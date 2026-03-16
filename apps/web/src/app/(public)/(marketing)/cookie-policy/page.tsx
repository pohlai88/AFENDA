import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle,
  Cookie,
  Shield,
  Lock,
  Trash2,
  Settings,
  AlertCircle,
  Globe,
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
    title: "Essential Only",
    body: "AFENDA uses strictly necessary cookies for authentication and security. No tracking, analytics, or advertising cookies.",
    icon: Cookie,
    badge: "Essential",
    tone: "premium",
  },
  {
    title: "No Consent Required",
    body: "Under GDPR Article 6(1)(b), essential cookies do not require consent as they are necessary for service delivery.",
    icon: Shield,
    badge: "GDPR 6(1)(b)",
    tone: "raised",
  },
  {
    title: "Minimal Data",
    body: "Three cookies only: session authentication, CSRF protection, and temporary redirect state during login flow.",
    icon: Lock,
    badge: "3 Cookies",
    tone: "default",
  },
  {
    title: "Transparent Control",
    body: "Clear documentation of purpose, duration, and browser-level management instructions for all cookies.",
    icon: Settings,
    badge: "Control",
    tone: "default",
  },
] as const satisfies readonly HighlightCard[];

const POLICY_CLUSTERS = [
  {
    title: "Cookies We Use",
    description:
      "All cookies listed below are strictly necessary for authentication and security. The platform cannot function without them.",
    lane: "operator",
    columns: 2,
    cards: [
      {
        title: "session",
        body: "Stores session token for user authentication. Duration: 8 hours (expires on logout or timeout). Category: Strictly Necessary.",
        icon: Lock,
        badge: "8h",
        tone: "premium",
      },
      {
        title: "csrf-token",
        body: "CSRF protection for authentication requests. Duration: Session (cleared when browser closes). Category: Strictly Necessary.",
        icon: Shield,
        badge: "Session",
      },
      {
        title: "callback-url",
        body: "Temporary redirect URL during login flow. Duration: Session (cleared after redirect). Category: Strictly Necessary.",
        icon: Globe,
        badge: "Temp",
      },
      {
        title: "No Third-Party Cookies",
        body: "AFENDA does not set or accept third-party cookies. All cookies are first-party only, issued by afenda.com domain for essential platform operations.",
        icon: CheckCircle,
        badge: "1st Party",
        tone: "raised",
      },
    ],
  },
  {
    title: "Legal Basis and Consent",
    description:
      "Why AFENDA does not display a cookie consent banner and the legal framework supporting essential cookie use.",
    lane: "institutional",
    columns: 2,
    cards: [
      {
        title: "GDPR Article 6(1)(b)",
        body: "Strictly necessary cookies do not require user consent under GDPR because they are essential for the service to function. Without these cookies, authentication would fail.",
        icon: Shield,
        badge: "GDPR",
        tone: "premium",
      },
      {
        title: "No Analytics or Tracking",
        body: "AFENDA does not use analytics, marketing, or tracking cookies. If introduced in the future, a consent banner will be displayed and this policy updated.",
        icon: CheckCircle,
      },
      {
        title: "Contractual Necessity",
        body: "Cookie processing is based on contractual necessity for service delivery, not consent, as defined under privacy regulations.",
        icon: AlertCircle,
      },
      {
        title: "Policy Transparency",
        body: "All cookies are documented with purpose, duration, and category. Changes to cookie usage will trigger policy updates and user notification.",
        icon: Lock,
        badge: "Transparent",
      },
    ],
  },
  {
    title: "Managing Cookies",
    description:
      "Browser-level cookie management instructions and impact of blocking essential cookies.",
    lane: "operator",
    columns: 2,
    cards: [
      {
        title: "Clear Existing Cookies",
        body: "Most browsers allow cookie deletion through Settings → Privacy → Clear Browsing Data. Session cookies are also cleared when you sign out.",
        icon: Trash2,
      },
      {
        title: "Block Cookies",
        body: "You can block all cookies through browser settings, but this will prevent you from signing in to AFENDA as authentication requires session cookies.",
        icon: AlertCircle,
        badge: "Impact",
        tone: "muted",
      },
      {
        title: "Browser Settings",
        body: "Chrome: Settings → Privacy → Cookies. Firefox: Preferences → Privacy → Cookies. Safari: Preferences → Privacy → Manage Website Data.",
        icon: Settings,
      },
      {
        title: "Sign Out",
        body: "Signing out of AFENDA clears session cookies immediately. You can also use private/incognito browsing mode for session isolation.",
        icon: Lock,
      },
    ],
  },
] as const satisfies readonly PolicyCluster[];

export const metadata: Metadata = {
  title: "Cookie Policy — AFENDA | Business Truth Engine",
  description:
    "Essential cookies only for authentication and security. No tracking, no analytics, no advertising. Strictly necessary cookies under GDPR Article 6(1)(b).",
  alternates: { canonical: "/cookie-policy" },
  openGraph: {
    title: "Cookie Policy — AFENDA",
    description:
      "Transparent cookie usage for authentication, security, and essential service delivery.",
    type: "website",
    url: "/cookie-policy",
  },
};

const COOKIE_PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Cookie Policy — AFENDA",
  description:
    "Transparent cookie usage for authentication, security, and essential service delivery with GDPR compliance.",
  url: "https://afenda.com/cookie-policy",
} as const;

const COOKIE_PAGE_JSON_LD_HTML = JSON.stringify(COOKIE_PAGE_JSON_LD).replace(/</g, "\\u003c");

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

export default function CookiePolicyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: COOKIE_PAGE_JSON_LD_HTML }}
      />

      <MarketingInfoShell width="narrow">
        <AnimatedFadeIn>
          <MarketingInfoHeader>
            <MarketingInfoKicker>Legal — Last Updated March 16, 2026</MarketingInfoKicker>
            <MarketingInfoTitle>Cookie usage for authentication and security.</MarketingInfoTitle>
            <MarketingInfoDescription>
              AFENDA uses strictly necessary cookies only. No tracking, analytics, or advertising.
            </MarketingInfoDescription>
            <MarketingInfoMeta>
              <AnimatedBadge tone="primary">
                <Cookie className="mr-1.5 inline h-3 w-3" aria-hidden />
                Essential Only
              </AnimatedBadge>
              <AnimatedBadge tone="primary">
                <Shield className="mr-1.5 inline h-3 w-3" aria-hidden />
                No Tracking
              </AnimatedBadge>
              <AnimatedBadge tone="premium">
                <CheckCircle className="mr-1.5 inline h-3 w-3" aria-hidden />
                GDPR 6(1)(b)
              </AnimatedBadge>
            </MarketingInfoMeta>
          </MarketingInfoHeader>
        </AnimatedFadeIn>

        <MarketingInfoContent>
          <AnimatedFadeIn>
            <div className="mi-prose">
              <p>
                This policy explains AFENDA's use of strictly necessary cookies for authentication
                and security. We do not use tracking, analytics, or advertising cookies.
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
                For browser-specific cookie management instructions, see{" "}
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Chrome
                </a>
                ,{" "}
                <a
                  href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Firefox
                </a>
                , or{" "}
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Safari
                </a>{" "}
                documentation.
              </p>
              <p>
                Questions? Contact{" "}
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
                Review adjacent policy and trust surfaces for privacy, terms, and compliance.
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
        </AnimatedFadeIn>
      </MarketingInfoShell>
    </>
  );
}
