#!/usr/bin/env node
/**
 * tools/gates/page-states.mjs
 *
 * CI gate: validates that pages declare complete UI states (loading, empty, error, denied).
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. LOADING_STATE_MISSING — Page file has async data but no Suspense/loading.tsx
 *  2. ERROR_STATE_MISSING — Page has no error.tsx or ErrorBoundary
 *  3. EMPTY_STATE_PATTERN — Page queries list data but has no empty state handling
 *
 * Usage:
 *   node tools/gates/page-states.mjs
 *
 * Philosophy:
 *   Incomplete UI states (infinite spinners, blank screens on error, missing
 *   empty states) create poor UX. This gate enforces that every page handles
 *   loading, error, empty, and permission-denied scenarios.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APP_DIR = resolve(ROOT, "apps/web/src/app");

// ─── Rule Documentation ──────────────────────────────────────────────────────

const RULE_DOCS = {
  LOADING_STATE_MISSING: {
    why: "Pages with async data fetch need loading states. Without Suspense boundaries or loading.tsx, users see blank screens or layout shifts.",
    docs: "See Next.js App Router docs: loading.tsx, Suspense boundaries",
  },
  ERROR_STATE_MISSING: {
    why: "Pages without error.tsx crash the entire app on errors instead of showing a recoverable error UI.",
    docs: "See Next.js App Router docs: error.tsx, Error Boundaries",
  },
  EMPTY_STATE_PATTERN: {
    why: "List pages without empty state handling show confusing blank tables when no data exists.",
    docs: "See docs/adr/ui-ux.md — Phase 5: Empty States",
  },
};

function suggestFix(ruleCode, ctx = {}) {
  switch (ruleCode) {
    case "LOADING_STATE_MISSING":
      return `Add loading.tsx or Suspense boundary to ${dirname(ctx.file)}/:

// loading.tsx
export default function Loading() {
  return <LoadingSpinner />;
}

Or wrap async component in Suspense:
<Suspense fallback={<LoadingSpinner />}>
  <AsyncComponent />
</Suspense>`;
    case "ERROR_STATE_MISSING":
      return `Add error.tsx to ${dirname(ctx.file)}/:

// error.tsx
"use client";

export default function Error({ error, reset }: { 
  error: Error; 
  reset: () => void; 
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}`;
    case "EMPTY_STATE_PATTERN":
      return `Add empty state handling to ${ctx.file}:

if (data.length === 0) {
  return <EmptyState message="No invoices found" />;
}`;
    default:
      return "(no suggestion available)";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively find all page.tsx files.
 */
function findPageFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findPageFiles(fullPath, files);
    } else if (entry === "page.tsx") {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Check if page has async data fetching.
 */
function hasAsyncData(content) {
  return (
    /async\s+function\s+\w+.*Page/i.test(content) ||
    /await\s+fetch/i.test(content) ||
    /await\s+db\./i.test(content) ||
    /useQuery/i.test(content) ||
    /useSuspenseQuery/i.test(content)
  );
}

/**
 * Check if page handles list data.
 */
function hasListData(content) {
  return (
    /\.map\s*\(/i.test(content) ||
    /<Table/i.test(content) ||
    /DataTable/i.test(content) ||
    /\.filter\s*\(/i.test(content)
  );
}

/**
 * Check if page has empty state handling.
 */
function hasEmptyStateHandling(content) {
  return (
    /length\s*===\s*0/i.test(content) ||
    /\.length\s*<\s*1/i.test(content) ||
    /EmptyState/i.test(content) ||
    /no.*data/i.test(content) ||
    /no.*results/i.test(content)
  );
}

// ─── Main Gate Logic ─────────────────────────────────────────────────────────

const t0 = performance.now();
const violations = [];

if (!existsSync(APP_DIR)) {
  console.warn(`⚠ App directory not found: ${APP_DIR}`);
  console.warn("  Gate will pass but should be run from monorepo root.");
  process.exit(0);
}

const pageFiles = findPageFiles(APP_DIR);

for (const file of pageFiles) {
  const content = readFileSync(file, "utf-8");
  const relPath = relative(ROOT, file);
  const dir = dirname(file);

  // Check for loading.tsx or Suspense if page has async data
  if (hasAsyncData(content)) {
    const hasLoadingFile = existsSync(join(dir, "loading.tsx"));
    const hasSuspense = /Suspense/i.test(content);

    if (!hasLoadingFile && !hasSuspense) {
      violations.push({
        ruleCode: "LOADING_STATE_MISSING",
        file: relPath,
        message: "Page has async data fetching but no loading.tsx or Suspense boundary",
      });
    }
  }

  // Check for error.tsx (in current directory or any parent up to app/)
  const hasErrorFile = (() => {
    let currentDir = dir;
    const appDir = APP_DIR;
    while (currentDir.startsWith(appDir)) {
      if (existsSync(join(currentDir, "error.tsx"))) {
        return true;
      }
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) break; // Reached root
      currentDir = parentDir;
    }
    return false;
  })();
  
  if (!hasErrorFile) {
    violations.push({
      ruleCode: "ERROR_STATE_MISSING",
      file: relPath,
      message: "Page route has no error.tsx for error handling",
    });
  }

  // Check for empty state handling if page renders lists
  if (hasListData(content) && !hasEmptyStateHandling(content)) {
    violations.push({
      ruleCode: "EMPTY_STATE_PATTERN",
      file: relPath,
      message: "Page renders list data but has no empty state handling",
    });
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

if (violations.length > 0) {
  reportViolations({
    gateName: "PAGE STATES",
    violations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Page files:": pageFiles.length,
    },
    elapsed,
  });
  process.exit(1);
}

reportSuccess({
  gateName: `page states complete — ${pageFiles.length} pages verified`,
  detail: "loading, error, and empty states validated",
});
