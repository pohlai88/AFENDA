#!/usr/bin/env node
/**
 * agents-drift.mjs — CLI drift guard that validates .agents/ against PROJECT.md.
 *
 * Checks:
 *   1. Monorepo structure declared in PROJECT.md §12 exists on disk
 *   2. Skills referenced in PROJECT.md §17 exist in skills-registry.json
 *   3. Conventions in PROJECT.md §2 are reflected (tenant_id, RLS, outbox, etc.)
 *   4. Deployment units in PROJECT.md §3 match expected app dirs
 *   5. Automation commands in PROJECT.md §13 are wired in package.json
 *   6. .agents internal consistency (registry ↔ disk ↔ docs)
 *
 * Usage:
 *   node .agents/tools/agents-drift.mjs           # full drift check
 *   node .agents/tools/agents-drift.mjs --fix      # auto-fix what can be fixed (regenerate docs)
 *   node .agents/tools/agents-drift.mjs --section 12  # check only §12
 *
 * Exit codes:
 *   0 = no drift
 *   1 = drift detected
 *   2 = fatal error (missing PROJECT.md, etc.)
 *
 * Zero dependencies — uses only Node.js built-ins.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AGENTS_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(AGENTS_ROOT, '..');
const PROJECT_MD = join(REPO_ROOT, 'PROJECT.md');
const REGISTRY_PATH = join(AGENTS_ROOT, 'skills-registry.json');
const SKILLS_DIR = join(AGENTS_ROOT, 'skills');

const FIX_MODE = process.argv.includes('--fix');
const SECTION_FILTER = (() => {
  const idx = process.argv.indexOf('--section');
  return idx !== -1 && process.argv[idx + 1] ? parseInt(process.argv[idx + 1], 10) : null;
})();

// ─── Result Accumulator ─────────────────────────────────────────────────────

const results = { pass: [], fail: [], warn: [], skip: [] };

function pass(section, msg) {
  results.pass.push({ section, msg });
}
function fail(section, msg) {
  results.fail.push({ section, msg });
}
function warn(section, msg) {
  results.warn.push({ section, msg });
}
function skip(section, msg) {
  results.skip.push({ section, msg });
}

function shouldRun(section) {
  return SECTION_FILTER === null || SECTION_FILTER === section;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function dirExists(rel) {
  const abs = join(REPO_ROOT, rel);
  return existsSync(abs) && statSync(abs).isDirectory();
}

function fileExists(rel) {
  const abs = join(REPO_ROOT, rel);
  return existsSync(abs) && statSync(abs).isFile();
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function loadProjectMd() {
  if (!existsSync(PROJECT_MD)) {
    console.error(`FATAL: PROJECT.md not found at ${PROJECT_MD}`);
    process.exit(2);
  }
  return readFileSync(PROJECT_MD, 'utf-8');
}

// ─── §7: Domain Structure (Modular Monolith) ────────────────────────────────

function checkDomainStructure() {
  const section = 7;
  if (!shouldRun(section)) return;

  // Every module under packages/modules/ must follow the layered convention
  const modulesDir = join(REPO_ROOT, 'packages', 'modules');
  if (!existsSync(modulesDir)) {
    warn(section, 'packages/modules/ does not exist yet');
    return;
  }

  const modules = readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const mod of modules) {
    const modPath = join(modulesDir, mod);

    // Required layers: domain/, app/, infra/  OR  slices/, shared/, app/ (finance-style)
    const hasSlicesArch =
      existsSync(join(modPath, 'src/slices')) && existsSync(join(modPath, 'src/shared'));
    const requiredLayers = hasSlicesArch
      ? ['src/slices', 'src/shared', 'src/app']
      : ['src/domain', 'src/app', 'src/infra'];
    for (const layer of requiredLayers) {
      const layerPath = join(modPath, layer);
      if (existsSync(layerPath) && statSync(layerPath).isDirectory()) {
        pass(section, `Module "${mod}" has ${layer}/ layer`);
      } else {
        fail(section, `Module "${mod}" missing ${layer}/ layer (required per §7)`);
      }
    }

    // Required: public.ts entrypoint
    const publicTs = join(modPath, 'src', 'public.ts');
    if (existsSync(publicTs)) {
      pass(section, `Module "${mod}" has src/public.ts entrypoint`);
    } else {
      fail(section, `Module "${mod}" missing src/public.ts (required per §7)`);
    }
  }
}

// ─── §9: Finance P0 Spine ────────────────────────────────────────────────────

function checkFinanceSpine() {
  const section = 9;
  if (!shouldRun(section)) return;

  // Finance entities may live in src/domain/entities/ OR src/slices/*/entities/
  const financeSrc = join(REPO_ROOT, 'packages', 'modules', 'finance', 'src');
  const classicEntities = join(financeSrc, 'domain', 'entities');
  const hasClassicLayout = existsSync(classicEntities);

  // Required P0 entities per §9  (slice → entity file mapping)
  const requiredEntities = [
    { file: 'journal.ts', desc: 'Journal + JournalLine', slice: 'slices/gl/entities' },
    { file: 'account.ts', desc: 'Chart of Accounts', slice: 'slices/gl/entities' },
    { file: 'fiscal-period.ts', desc: 'Fiscal periods', slice: 'slices/gl/entities' },
    { file: 'ledger.ts', desc: 'Ledger + base currency', slice: 'slices/gl/entities' },
    { file: 'gl-balance.ts', desc: 'Trial balance + GL balances', slice: 'slices/gl/entities' },
    { file: 'fx-rate.ts', desc: 'FX rates + currency conversion', slice: 'slices/fx/entities' },
    { file: 'intercompany.ts', desc: 'Intercompany relationships', slice: 'slices/ic/entities' },
  ];

  let foundAny = false;
  for (const { file, desc, slice } of requiredEntities) {
    const classicPath = join(financeSrc, 'domain', 'entities', file);
    const slicePath = join(financeSrc, slice, file);
    if (existsSync(classicPath) || existsSync(slicePath)) {
      pass(section, `Finance entity "${file}" exists (${desc})`);
      foundAny = true;
    } else {
      fail(section, `Finance entity "${file}" missing -- ${desc} (required per S9)`);
    }
  }
  if (!foundAny && !hasClassicLayout) {
    // Only fail on missing directory if zero entities were found anywhere
    fail(
      section,
      'Finance entities directory missing (neither domain/entities/ nor slices/*/entities/)'
    );
  }

  // Check postJournal service exists (classic: app/services/ OR slices: slices/gl/services/)
  const postJournalClassic = join(financeSrc, 'app', 'services', 'post-journal.ts');
  const postJournalSlice = join(financeSrc, 'slices', 'gl', 'services', 'post-journal.ts');
  if (existsSync(postJournalClassic) || existsSync(postJournalSlice)) {
    pass(section, 'postJournal service exists');
  } else {
    fail(
      section,
      'postJournal service missing (required per S9: journal draft -> validate -> post)'
    );
  }
}

// ─── §3: Deployment Units ───────────────────────────────────────────────────

function checkDeploymentUnits() {
  const section = 3;
  if (!shouldRun(section)) return;

  const units = ['apps/web', 'apps/api', 'apps/worker'];
  for (const unit of units) {
    if (dirExists(unit)) {
      pass(section, `Deployment unit "${unit}" exists`);
    } else {
      warn(section, `Deployment unit "${unit}" not yet created (expected per §3)`);
    }
  }
}

// ─── §12: Monorepo Structure ────────────────────────────────────────────────

function checkMonorepoStructure() {
  const section = 12;
  if (!shouldRun(section)) return;

  // Core directories declared in PROJECT.md §12
  const expectedDirs = [
    'apps',
    'packages',
    'packages/core',
    'packages/contracts',
    'packages/authz',
    'packages/db',
    'packages/platform',
    'packages/modules',
    'packages/modules/finance',
    'tools',
    'tools/generators',
    'tools/drift-check',
  ];

  for (const dir of expectedDirs) {
    if (dirExists(dir)) {
      pass(section, `Directory "${dir}" exists`);
    } else {
      fail(section, `Directory "${dir}" missing (declared in PROJECT.md §12)`);
    }
  }

  // Check docs/ directory (mentioned in §12 layout)
  if (dirExists('docs')) {
    pass(section, `Directory "docs" exists`);
  } else {
    warn(section, `Directory "docs" not yet created (optional per §12)`);
  }
}

// ─── §13: Automation Commands ───────────────────────────────────────────────

function checkAutomationCommands() {
  const section = 13;
  if (!shouldRun(section)) return;

  const rootPkg = loadJson(join(REPO_ROOT, 'package.json'));
  if (!rootPkg) {
    warn(section, 'No root package.json found -- cannot verify automation commands');
    return;
  }

  const scripts = rootPkg.scripts || {};

  // Commands declared in PROJECT.md §13
  const expectedCommands = [
    { cmd: 'dev', desc: 'web + api + worker + postgres' },
    { cmd: 'drift', desc: 'Validate structure vs PROJECT.md' },
    { cmd: 'db:reset', desc: 'migrate + seed demo tenant' },
    { cmd: 'build', desc: 'Build all apps + packages' },
    { cmd: 'test', desc: 'Run unit + integration tests' },
    { cmd: 'lint', desc: 'ESLint + dependency-rule checks' },
    { cmd: 'typecheck', desc: 'TS strict mode across monorepo' },
  ];

  for (const { cmd, desc } of expectedCommands) {
    if (scripts[cmd]) {
      pass(section, `Script "${cmd}" is wired (${desc})`);
    } else {
      fail(section, `Script "${cmd}" missing from package.json (declared in §13: ${desc})`);
    }
  }

  // Generator commands (may be wired differently)
  const genCommands = ['gen:module', 'gen:table', 'gen:endpoint', 'gen:outbox-event'];
  for (const cmd of genCommands) {
    if (scripts[cmd]) {
      pass(section, `Generator script "${cmd}" is wired`);
    } else {
      warn(section, `Generator script "${cmd}" not yet wired (declared in §13)`);
    }
  }
}

// ─── §14: Health Endpoints ──────────────────────────────────────────────────

function checkHealthEndpoints() {
  const section = 14;
  if (!shouldRun(section)) return;

  // We can only check if the route files exist, not if they serve correctly
  const healthPatterns = ['apps/api/src/**/health*', 'apps/api/src/**/ready*'];

  // Simple heuristic: grep for /health in the api source
  const apiSrc = join(REPO_ROOT, 'apps', 'api', 'src');
  if (!existsSync(apiSrc)) {
    warn(section, 'apps/api/src not found -- cannot verify health endpoints');
    return;
  }

  try {
    const files = readdirSync(apiSrc, { recursive: true }).join('\n');
    if (files.includes('health')) {
      pass(section, 'Health endpoint file detected in apps/api/src');
    } else {
      warn(section, 'No health endpoint file found in apps/api/src (expected per §14)');
    }
  } catch {
    warn(section, 'Could not scan apps/api/src for health endpoints');
  }
}

// ─── §17: Skills Referenced in PROJECT.md ───────────────────────────────────

function checkSkillsAlignment() {
  const section = 17;
  if (!shouldRun(section)) return;

  const projectMd = loadProjectMd();

  // PROJECT.md §17 references these skill categories
  const expectedSkillNames = [
    'next-best-practices',
    'nextjs-16-complete-guide',
    'optimized-nextjs-typescript',
    'drizzle',
    'zod',
    'monorepo-management',
    'pnpm',
    'form-builder',
    'shadcn-ui',
    'accessibility',
  ];

  // Check §17 text mentions these
  const section17Match = projectMd.match(/## 17\. Implementation Guidelines[\s\S]*?(?=\n## \d|$)/);
  if (!section17Match) {
    warn(section, 'Could not locate §17 in PROJECT.md');
    return;
  }
  const section17Text = section17Match[0];

  // Verify skills exist in registry
  const registry = loadJson(REGISTRY_PATH);
  if (!registry) {
    fail(section, 'skills-registry.json not found or invalid');
    return;
  }

  const registryNames = new Set(registry.skills.map((s) => s.name));

  for (const name of expectedSkillNames) {
    if (registryNames.has(name)) {
      pass(section, `Skill "${name}" referenced in §17 exists in registry`);
    } else {
      fail(section, `Skill "${name}" referenced in §17 is MISSING from registry`);
    }
  }

  // Check that §17 text mentions the skill categories
  const expectedMentions = [
    'next-best-practices',
    'drizzle',
    'zod',
    'shadcn',
    'accessibility',
    'monorepo-management',
    'pnpm',
    'form-builder',
  ];
  for (const mention of expectedMentions) {
    if (section17Text.toLowerCase().includes(mention.toLowerCase())) {
      pass(section, `§17 mentions "${mention}"`);
    } else {
      warn(section, `S17 does not mention "${mention}" -- consider updating PROJECT.md`);
    }
  }
}

// ─── .agents Internal Consistency ───────────────────────────────────────────

function checkAgentsInternal() {
  const section = 99; // Internal check, not a PROJECT.md section
  if (!shouldRun(section) && SECTION_FILTER !== null) return;

  // Registry exists
  if (!existsSync(REGISTRY_PATH)) {
    fail(section, 'skills-registry.json does not exist');
    return;
  }

  const registry = loadJson(REGISTRY_PATH);
  if (!registry || !Array.isArray(registry.skills)) {
    fail(section, 'skills-registry.json is invalid or has no skills array');
    return;
  }

  pass(section, `Registry loaded -- ${registry.skills.length} skills`);

  // Cross-check registry ↔ disk
  const registryNames = new Set(registry.skills.map((s) => s.name));
  const diskDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const name of registryNames) {
    if (diskDirs.includes(name)) {
      pass(section, `Registry skill "${name}" has matching directory`);
    } else {
      fail(section, `Registry skill "${name}" has NO directory on disk`);
    }
  }

  for (const dir of diskDirs) {
    if (!registryNames.has(dir)) {
      fail(section, `Disk directory "${dir}" is NOT in registry -- add it or remove the directory`);
    }
    const skillMd = join(SKILLS_DIR, dir, 'SKILL.md');
    if (!existsSync(skillMd)) {
      fail(section, `Skill "${dir}" has no SKILL.md`);
    }
  }

  // Check generated docs are up to date
  const indexMd = existsSync(join(AGENTS_ROOT, 'INDEX.md'))
    ? readFileSync(join(AGENTS_ROOT, 'INDEX.md'), 'utf-8')
    : '';
  if (!indexMd.includes('AUTO-GENERATED')) {
    warn(section, 'INDEX.md is not auto-generated -- run `node .agents/tools/agents-gen.mjs`');
  }

  const installedMd = existsSync(join(SKILLS_DIR, 'INSTALLED-SKILLS.md'))
    ? readFileSync(join(SKILLS_DIR, 'INSTALLED-SKILLS.md'), 'utf-8')
    : '';
  if (!installedMd.includes('AUTO-GENERATED')) {
    warn(
      section,
      'INSTALLED-SKILLS.md is not auto-generated -- run `node .agents/tools/agents-gen.mjs`'
    );
  }

  // README.md must exist
  const readmePath = join(AGENTS_ROOT, 'README.md');
  if (existsSync(readmePath)) {
    pass(section, 'README.md exists');
  } else {
    fail(section, 'README.md missing from .agents/');
  }

  // SKILL-TEMPLATE.md must exist
  const templatePath = join(SKILLS_DIR, 'SKILL-TEMPLATE.md');
  if (existsSync(templatePath)) {
    pass(section, 'SKILL-TEMPLATE.md exists');
  } else {
    fail(section, 'SKILL-TEMPLATE.md missing from .agents/skills/');
  }

  // Validate skill priorities are valid values
  const validPriorities = new Set(['high', 'medium', 'low']);
  for (const skill of registry.skills) {
    if (!skill.priority) {
      warn(section, `Skill "${skill.name}" missing priority field`);
    } else if (!validPriorities.has(skill.priority)) {
      fail(
        section,
        `Skill "${skill.name}" has invalid priority "${skill.priority}" (must be high|medium|low)`
      );
    }
  }

  // Validate each skill directory has a SKILL.md with frontmatter
  for (const dir of diskDirs) {
    const skillMdPath = join(SKILLS_DIR, dir, 'SKILL.md');
    if (existsSync(skillMdPath)) {
      const content = readFileSync(skillMdPath, 'utf-8');
      if (!content.startsWith('---')) {
        warn(
          section,
          `Skill "${dir}/SKILL.md" missing YAML frontmatter (expected per SKILL-TEMPLATE.md)`
        );
      }
    }
  }
}

// ─── §2: Non-Optional Conventions (structural checks) ──────────────────────

function checkConventions() {
  const section = 2;
  if (!shouldRun(section)) return;

  // Check that packages/db exists (layer rule: only infra touches DB)
  if (dirExists('packages/db')) {
    pass(section, 'packages/db exists (DB layer isolation)');
  } else {
    warn(section, 'packages/db not yet created');
  }

  // Check that packages/modules/finance exists (finance-first spine)
  if (dirExists('packages/modules/finance')) {
    pass(section, 'packages/modules/finance exists (finance-first spine)');
  } else {
    warn(section, 'packages/modules/finance not yet created (P0 priority per §9)');
  }

  // Check for .env.example
  if (fileExists('.env.example')) {
    pass(section, '.env.example exists');
  } else {
    warn(section, '.env.example not found (required per §13 Local Parity Checklist)');
  }

  // §2.3 — Module boundaries: each module must have public.ts
  const modulesDir = join(REPO_ROOT, 'packages', 'modules');
  if (existsSync(modulesDir)) {
    const modules = readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const mod of modules) {
      const publicTs = join(modulesDir, mod, 'src', 'public.ts');
      if (existsSync(publicTs)) {
        pass(section, `Module "${mod}" exports via public.ts (§2.3)`);
      } else {
        fail(
          section,
          `Module "${mod}" missing public.ts entrypoint (§2.3: modules export only public.ts)`
        );
      }
    }
  }

  // §2.6 — Outbox pattern: packages/db should have outbox schema
  const outboxSchema = join(REPO_ROOT, 'packages', 'db', 'src', 'schema', 'outbox.ts');
  if (existsSync(outboxSchema)) {
    pass(section, 'Outbox schema exists in packages/db (§2.6)');
  } else {
    warn(
      section,
      'Outbox schema not found in packages/db/src/schema/outbox.ts (S2.6: async is outbox -> worker)'
    );
  }
}

// ─── §1: Tech Stack Verification ───────────────────────────────────────────

function checkTechStack() {
  const section = 1;
  if (!shouldRun(section)) return;

  const rootPkg = loadJson(join(REPO_ROOT, 'package.json'));
  if (!rootPkg) {
    warn(section, 'No root package.json -- cannot verify tech stack');
    return;
  }

  const allDeps = {
    ...(rootPkg.dependencies || {}),
    ...(rootPkg.devDependencies || {}),
  };

  // Check for pnpm-workspace.yaml (Turborepo + pnpm)
  if (fileExists('pnpm-workspace.yaml')) {
    pass(section, 'pnpm-workspace.yaml exists');
  } else {
    fail(section, 'pnpm-workspace.yaml missing (required per §1: pnpm + Turborepo)');
  }

  // Check for turbo.json
  if (fileExists('turbo.json')) {
    pass(section, 'turbo.json exists');
  } else {
    warn(section, 'turbo.json not found (expected per §1: Turborepo)');
  }

  // Check for typescript
  if (allDeps['typescript']) {
    pass(section, `TypeScript found: ${allDeps['typescript']}`);
  } else {
    warn(section, 'TypeScript not in root dependencies');
  }

  // Verify key catalog dependencies exist in pnpm-workspace.yaml
  const workspacePath = join(REPO_ROOT, 'pnpm-workspace.yaml');
  if (existsSync(workspacePath)) {
    const wsContent = readFileSync(workspacePath, 'utf-8');
    const catalogDeps = [
      'zod',
      'drizzle-orm',
      'fastify',
      'next',
      'react',
      'tailwindcss',
      'graphile-worker',
      'pino',
      'postgres',
    ];
    for (const dep of catalogDeps) {
      if (wsContent.includes(`${dep}:`)) {
        pass(section, `Catalog dep "${dep}" found in pnpm-workspace.yaml`);
      } else {
        warn(section, `Catalog dep "${dep}" missing from pnpm-workspace.yaml (expected per §1)`);
      }
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────

function printReport() {
  const sectionLabel = (s) => (s === 99 ? '.agents' : `§${s}`);

  console.log('\n+----------------------------------------------------------+');
  console.log('|          AFENDA-NEXUS Drift Guard Report                |');
  console.log('+----------------------------------------------------------+\n');

  if (results.fail.length > 0) {
    console.log(`[FAIL] FAILURES (${results.fail.length}):\n`);
    for (const { section, msg } of results.fail) {
      console.log(`  [${sectionLabel(section)}] ${msg}`);
    }
    console.log('');
  }

  if (results.warn.length > 0) {
    console.log(`[WARN] WARNINGS (${results.warn.length}):\n`);
    for (const { section, msg } of results.warn) {
      console.log(`  [${sectionLabel(section)}] ${msg}`);
    }
    console.log('');
  }

  if (results.pass.length > 0) {
    console.log(`[PASS] PASSED (${results.pass.length}):\n`);
    for (const { section, msg } of results.pass) {
      console.log(`  [${sectionLabel(section)}] ${msg}`);
    }
    console.log('');
  }

  if (results.skip.length > 0) {
    console.log(`[SKIP] SKIPPED (${results.skip.length}):\n`);
    for (const { section, msg } of results.skip) {
      console.log(`  [${sectionLabel(section)}] ${msg}`);
    }
    console.log('');
  }

  console.log('-----------------------------------------------------------');
  console.log(
    `  Total: ${results.pass.length} passed, ${results.fail.length} failed, ${results.warn.length} warnings`
  );
  console.log('-----------------------------------------------------------\n');

  if (results.fail.length > 0) {
    console.log('=> Fix failures before merging. Warnings are advisory.\n');
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('Running AFENDA-NEXUS drift guard...\n');

  checkTechStack();
  checkConventions();
  checkDeploymentUnits();
  checkDomainStructure();
  checkMonorepoStructure();
  checkAutomationCommands();
  checkHealthEndpoints();
  checkFinanceSpine();
  checkSkillsAlignment();
  checkAgentsInternal();

  printReport();

  if (FIX_MODE && results.fail.length > 0) {
    console.log('[FIX] --fix mode: attempting auto-fixes...\n');

    // Auto-fix: regenerate docs
    try {
      const genScript = join(AGENTS_ROOT, 'tools', 'agents-gen.mjs');
      if (existsSync(genScript)) {
        execSync(`node "${genScript}"`, { stdio: 'inherit', cwd: REPO_ROOT });
        console.log('[PASS] Regenerated INDEX.md + INSTALLED-SKILLS.md\n');
      }
    } catch (e) {
      console.error('[FAIL] Auto-fix failed:', e.message);
    }
  }

  process.exit(results.fail.length > 0 ? 1 : 0);
}

main();
