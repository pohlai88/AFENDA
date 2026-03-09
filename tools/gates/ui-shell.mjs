#!/usr/bin/env node
/**
 * tools/gates/ui-shell.mjs
 *
 * CI gate: enforces RootShell usage and shell registry completeness.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. ROOT_LAYOUT_NO_SHELL — Root layout must use ShellLayoutWrapper.
 *  2. SHELL_WRAPPER_NO_ROOTSHELL — ShellLayoutWrapper must wrap with RootShell
 *     for non-auth routes.
 *  3. SURFACE_HREF_MISSING — Every surface href in registry must have a
 *     corresponding page.tsx in apps/web.
 *  4. DOMAIN_HAS_SURFACES — Every domain in registry must have ≥1 surface.
 *  5. MODULE_HAS_DOMAINS — Every module in registry must have ≥1 domain.
 *
 * Usage:
 *   node tools/gates/ui-shell.mjs
 *
 * Philosophy:
 *   No ad hoc layouts — all routes go through RootShell. Registries must
 *   be complete so navigation and DomainBurger work correctly.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APP_DIR = resolve(ROOT, "apps/web/src/app");
const LAYOUT_FILE = resolve(ROOT, "apps/web/src/app/layout.tsx");
const SHELL_WRAPPER = resolve(ROOT, "apps/web/src/components/ShellLayoutWrapper.tsx");
const SURFACE_REGISTRY = resolve(ROOT, "packages/ui/src/shell/registry/surface-registry.ts");
const DOMAIN_REGISTRY = resolve(ROOT, "packages/ui/src/shell/registry/domain-registry.ts");
const MODULE_REGISTRY = resolve(ROOT, "packages/ui/src/shell/registry/module-registry.ts");

// href prefix -> app route group (path segment)
const HREF_TO_APP_PREFIX = {
  "/finance": "(erp)/finance",
  "/governance": "(kernel)/governance",
  "/analytics": "(erp)/analytics",
  "/admin": "(kernel)/admin",
};

// ─── Rule Documentation ──────────────────────────────────────────────────────

const RULE_DOCS = {
  ROOT_LAYOUT_NO_SHELL: {
    why: "Root layout must use ShellLayoutWrapper so all routes get RootShell.",
    docs: "See docs/adr/app-shell.md — ShellLayoutWrapper wraps non-auth routes with RootShell.",
  },
  SHELL_WRAPPER_NO_ROOTSHELL: {
    why: "ShellLayoutWrapper must render RootShell for non-auth, non-print routes.",
    docs: "See apps/web/src/components/ShellLayoutWrapper.tsx — ensure RootShell wraps children.",
  },
  SURFACE_HREF_MISSING: {
    why: "Surface hrefs without pages create broken navigation links.",
    docs: "Add page.tsx at the corresponding app path, or remove the surface from registry.",
  },
  DOMAIN_HAS_SURFACES: {
    why: "Domains without surfaces appear empty in the DomainBurger.",
    docs: "Add surfaces for the domain in surface-registry.ts, or remove the domain.",
  },
  MODULE_HAS_DOMAINS: {
    why: "Modules without domains have nothing to show in the DomainBurger.",
    docs: "Add domains for the module in domain-registry.ts, or remove the module.",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractHrefsFromSurfaceRegistry(content) {
  const hrefs = [];
  const re = /href:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    hrefs.push(m[1]);
  }
  return hrefs;
}

function extractDomains(content) {
  const domains = [];
  // Match domain blocks: { id: "x", moduleId: "y", ... }
  const blockRe = /\{\s*id:\s*"(\w+)"[\s\S]*?moduleId:\s*"(\w+)"[\s\S]*?\}/g;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    domains.push({ id: m[1], moduleId: m[2] });
  }
  return domains;
}

function extractSurfacesByDomain(content) {
  const surfaces = [];
  // Match surface blocks: { id: "x", moduleId: "y", domainId: "z", ... }
  const blockRe = /\{\s*id:\s*"([^"]+)"[\s\S]*?moduleId:\s*"([^"]+)"[\s\S]*?domainId:\s*"([^"]+)"[\s\S]*?\}/g;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    surfaces.push({ id: m[1], moduleId: m[2], domainId: m[3] });
  }
  return surfaces;
}

function extractModules(content) {
  const modules = [];
  // Match module blocks in MODULES array: { id: "x", label: ...
  const blockRe = /\{\s*id:\s*"(\w+)"[\s\S]*?label:\s*[^,]+[\s\S]*?href:/g;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    modules.push(m[1]);
  }
  return modules;
}

function hrefToAppPath(href) {
  for (const [prefix, appPrefix] of Object.entries(HREF_TO_APP_PREFIX)) {
    if (href.startsWith(prefix)) {
      const suffix = href.slice(prefix.length) || "";
      const fullPath = join(APP_DIR, appPrefix, suffix, "page.tsx");
      return fullPath.replace(/\/+/g, "/");
    }
  }
  return null;
}

// ─── Main Gate Logic ─────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];
const stats = {};

// 1. Root layout uses ShellLayoutWrapper
if (existsSync(LAYOUT_FILE)) {
  const layoutContent = readFileSync(LAYOUT_FILE, "utf-8");
  if (!layoutContent.includes("ShellLayoutWrapper")) {
    violations.push({
      ruleCode: "ROOT_LAYOUT_NO_SHELL",
      file: relative(ROOT, LAYOUT_FILE),
      message: "Root layout must use ShellLayoutWrapper to wrap children with RootShell",
      fix: "Import ShellLayoutWrapper and wrap {children} with <ShellLayoutWrapper>{children}</ShellLayoutWrapper>",
    });
  }
  stats["Root layout:"] = "checked";
}

// 2. ShellLayoutWrapper uses RootShell for non-auth
if (existsSync(SHELL_WRAPPER)) {
  const wrapperContent = readFileSync(SHELL_WRAPPER, "utf-8");
  if (!wrapperContent.includes("RootShell")) {
    violations.push({
      ruleCode: "SHELL_WRAPPER_NO_ROOTSHELL",
      file: relative(ROOT, SHELL_WRAPPER),
      message: "ShellLayoutWrapper must render RootShell for non-auth routes",
      fix: "Return <RootShell>{children}</RootShell> (or equivalent) when not on auth/print route",
    });
  }
  stats["ShellLayoutWrapper:"] = "checked";
}

// 3. Every surface href has a page
if (existsSync(SURFACE_REGISTRY)) {
  const surfaceContent = readFileSync(SURFACE_REGISTRY, "utf-8");
  const hrefs = extractHrefsFromSurfaceRegistry(surfaceContent);
  stats["Surface hrefs:"] = hrefs.length;

  for (const href of hrefs) {
    const pagePath = hrefToAppPath(href);
    if (pagePath && !existsSync(pagePath)) {
      violations.push({
        ruleCode: "SURFACE_HREF_MISSING",
        file: `surface-registry.ts (href: ${href})`,
        message: `No page.tsx exists for surface href "${href}"`,
        fix: `Add apps/web/src/app/.../page.tsx for route ${href}. Expected path: ${relative(ROOT, pagePath)}`,
      });
    }
  }
}

// 4. Every domain has ≥1 surface
if (existsSync(SURFACE_REGISTRY) && existsSync(DOMAIN_REGISTRY)) {
  const domainContent = readFileSync(DOMAIN_REGISTRY, "utf-8");
  const surfaceContent = readFileSync(SURFACE_REGISTRY, "utf-8");
  const domains = extractDomains(domainContent);
  const surfaces = extractSurfacesByDomain(surfaceContent);

  for (const domain of domains) {
    const hasSurface = surfaces.some(
      (s) => s.moduleId === domain.moduleId && s.domainId === domain.id,
    );
    if (!hasSurface) {
      violations.push({
        ruleCode: "DOMAIN_HAS_SURFACES",
        file: "domain-registry.ts",
        message: `Domain "${domain.moduleId}/${domain.id}" has no surfaces in surface registry`,
        fix: `Add at least one surface with moduleId: "${domain.moduleId}", domainId: "${domain.id}" in surface-registry.ts`,
      });
    }
  }
  stats["Domains:"] = domains.length;
}

// 5. Every module has ≥1 domain
if (existsSync(MODULE_REGISTRY) && existsSync(DOMAIN_REGISTRY)) {
  const moduleContent = readFileSync(MODULE_REGISTRY, "utf-8");
  const domainContent = readFileSync(DOMAIN_REGISTRY, "utf-8");
  const modules = extractModules(moduleContent);
  const domains = extractDomains(domainContent);

  for (const moduleId of modules) {
    const hasDomain = domains.some((d) => d.moduleId === moduleId);
    if (!hasDomain) {
      violations.push({
        ruleCode: "MODULE_HAS_DOMAINS",
        file: "module-registry.ts",
        message: `Module "${moduleId}" has no domains in domain registry`,
        fix: `Add at least one domain with moduleId: "${moduleId}" in domain-registry.ts`,
      });
    }
  }
  stats["Modules:"] = modules.length;
}

// ─── Report ──────────────────────────────────────────────────────────────────

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

if (violations.length > 0) {
  reportViolations({
    gateName: "UI SHELL",
    violations,
    ruleDocs: RULE_DOCS,
    stats,
    elapsed,
  });
  process.exit(1);
}

reportSuccess({
  gateName: "ui-shell — RootShell usage and registry completeness",
  detail: "layout, ShellLayoutWrapper, surface hrefs, domain/module consistency verified",
});
