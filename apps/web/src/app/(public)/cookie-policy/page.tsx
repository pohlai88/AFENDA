import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, Shield, Info } from "lucide-react";

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
  title: "Cookie Policy — AFENDA",
  description:
    "Cookie usage and data storage policies for AFENDA authentication and security.",
  alternates: { canonical: "/cookie-policy" },
  openGraph: {
    title: "Cookie Policy — AFENDA",
    description:
      "Transparent cookie usage for authentication, security, and essential service delivery.",
    type: "website",
    url: "/cookie-policy",
  },
};

const cookieData = [
  {
    name: "next-auth.session-token",
    purpose: "Stores encrypted JWT session for user authentication",
    category: "Strictly Necessary",
    duration: "8 hours (expires on logout or timeout)",
    icon: Shield,
  },
  {
    name: "next-auth.csrf-token",
    purpose: "CSRF protection for authentication requests",
    category: "Strictly Necessary",
    duration: "Session (cleared when browser closes)",
    icon: Shield,
  },
  {
    name: "next-auth.callback-url",
    purpose: "Temporary redirect URL during login flow",
    category: "Strictly Necessary",
    duration: "Session (cleared after redirect)",
    icon: Info,
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="w-full">
        <Card>
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-2xl">Cookie Policy</CardTitle>
            <CardDescription>
              How AFENDA uses cookies for authentication and security.
            </CardDescription>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Cookie className="h-3 w-3" aria-hidden="true" /> Essential Only
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" aria-hidden="true" /> No Tracking
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-8">
            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">What Are Cookies?</h3>
              <p className="text-muted-foreground">
                Cookies are small text files stored by your browser when you visit a website.
                They help websites remember your login state, preferences, and security settings.
              </p>
              <p className="text-muted-foreground">
                AFENDA uses <strong>strictly necessary cookies only</strong>. We do not use
                analytics, advertising, or tracking cookies.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h3 className="font-semibold text-sm">Cookies We Use</h3>
              <p className="text-sm text-muted-foreground">
                All cookies listed below are <strong>essential for authentication and
                security</strong>. The platform cannot function without them.
              </p>

              <div className="grid gap-4">
                {cookieData.map((cookie) => {
                  const Icon = cookie.icon;
                  return (
                    <Card key={cookie.name} className="border-muted">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm font-mono">
                              {cookie.name}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {cookie.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div>
                          <span className="font-semibold">Purpose:</span>{" "}
                          <span className="text-muted-foreground">{cookie.purpose}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Duration:</span>{" "}
                          <span className="text-muted-foreground">{cookie.duration}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <Separator />

            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">Why No Consent Banner?</h3>
              <p className="text-muted-foreground">
                Under GDPR Article 6(1)(b) and similar privacy regulations, <strong>strictly
                necessary cookies</strong> do not require user consent because they are
                essential for the service to function. Without these cookies, authentication
                would fail and the platform could not operate securely.
              </p>
              <p className="text-muted-foreground">
                If we introduce analytics or marketing cookies in the future, we will display
                a consent banner and update this policy accordingly.
              </p>
            </section>

            <Separator />

            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">Managing Cookies</h3>
              <p className="text-muted-foreground">
                You can manage cookies through your browser settings:
              </p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>
                  <strong>Clear existing cookies:</strong> Most browsers allow you to delete
                  cookies through Settings → Privacy → Clear Browsing Data.
                </li>
                <li>
                  <strong>Block cookies:</strong> You can block all cookies, but this will
                  prevent you from signing in to AFENDA.
                </li>
                <li>
                  <strong>Sign out:</strong> The{" "}
                  <Link href="/auth/signout" className="text-primary hover:underline">
                    Sign Out
                  </Link>{" "}
                  action clears your session cookie immediately.
                </li>
              </ul>
              <p className="text-muted-foreground text-xs mt-4">
                For more information on cookie management:
              </p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-xs">
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Chrome cookie settings
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Firefox cookie settings
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Safari cookie settings
                  </a>
                </li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4 text-sm">
              <h3 className="font-semibold">Updates to This Policy</h3>
              <p className="text-muted-foreground">
                We may update this Cookie Policy as we add features or services. Changes will
                be posted on this page with a revised "Last Updated" date.
              </p>
              <p className="text-muted-foreground">
                <strong>Last Updated:</strong> March 9, 2026
              </p>
            </section>

            <div className="rounded-lg border border-muted bg-muted/50 p-4 text-center text-sm">
              <p className="text-muted-foreground">
                Questions about our cookie usage? Contact us at{" "}
                <a
                  href="mailto:legal@nexuscanon.com"
                  className="font-medium text-primary hover:underline"
                >
                  legal@nexuscanon.com
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Terms of Service
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
