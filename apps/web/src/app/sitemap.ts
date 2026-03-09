import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    "/",
    "/finance/ap/invoices",
    "/finance/ap/payments",
    "/finance/gl/accounts",
    "/finance/gl/journals",
    "/finance/gl/trial-balance",
    "/governance/audit/logs",
    "/governance/evidence/documents",
    "/governance/settings",
    "/governance/settings/access",
    "/governance/settings/company",
    "/governance/settings/custom-fields",
    "/governance/settings/features",
    "/governance/settings/numbering",
    "/governance/settings/security",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
