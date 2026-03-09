Yes — but the right target is **not “fully detect every error”**.
The right target is:

> **make bad changes expensive to merge and cheap to diagnose.**

A strong CI gate for AFENDA should be a **layered gate system** where each gate kills a different class of failure:

1. **static correctness** — type/import/schema/config mistakes
2. **behavior correctness** — unit/integration/e2e/runtime failures
3. **truth correctness** — DB drift, migration breakage, posting invariants
4. **UX correctness** — visual regressions, accessibility regressions, route-shell mismatch
5. **operational correctness** — build, startup, env, observability, deploy readiness

Because you are on **pnpm + Turborepo + TS + Next.js + Fastify + Drizzle**, this maps very cleanly to a monorepo task graph. Turborepo supports dependency-aware task relationships, caching, outputs, and filtered runs, which is exactly what you need for fast CI in a large repository. ([Turborepo][1])

# 1) The gate model you should use

Use **4 CI tiers** instead of one giant pipeline.

## Tier A — PR Fast Gates

Runs on every PR, finishes quickly, blocks obvious breakage.

This should include:

* install / lockfile integrity
* lint
* typecheck
* import-boundary gate
* dead export / circular dependency checks
* contract/schema consistency
* unit tests
* small smoke build
* changed-package Playwright smoke only

Purpose: reject broken PRs fast.

---

## Tier B — PR Deep Gates

Runs on PR too, but may be slightly slower.

This should include:

* DB migration validation
* ephemeral database integration tests
* API contract tests
* accessibility snapshots
* visual regression for critical screens
* worker/job tests
* route manifest / navigation integrity
* shell-page-module consistency

Purpose: catch “looks fine locally but actually broken”.

---

## Tier C — Main Branch Release Gates

Runs on merge to main.

This should include:

* full monorepo build
* full integration suite
* full cross-browser Playwright on critical paths
* migration up on clean DB
* migration up on realistic seeded DB
* app startup healthchecks
* bundle budgets
* artifact generation and SBOM/security scan

Purpose: prove trunk is releasable.

---

## Tier D — Nightly / Scheduled Torture Gates

Do not slow every PR with these.

This should include:

* full end-to-end regression
* long-running worker/idempotency tests
* concurrency/race-condition tests
* performance budgets
* Lighthouse-ish UX budgets if you want
* screenshot matrix across density/theme/locale
* mutation or fuzz tests in sensitive finance logic

Purpose: catch the rare and ugly failures.

# 2) The exact classes of breakage and the gate that should own each one

## A. Code errors / broken imports / missing wiring

Use:

* `eslint`
* `tsc --noEmit`
* custom import-boundary gate
* circular dependency detection
* unused exports / orphan modules check

For AFENDA, your custom gate matters more than lint.
You need a **Boundary Law Gate** that enforces:

* `contracts` cannot import from `db/core/api/web`
* `db` cannot import from monorepo packages
* `core` cannot import from `api/web`
* `apps/web` cannot import private internals across package boundaries
* UI cannot make authorization decisions directly

That catches architecture rot before runtime.

---

## B. Runtime breakage

Static analysis will not catch:

* missing env at startup
* misconfigured routes
* invalid runtime serialization
* background job failure
* SSR/client mismatch
* API boot issues

So add:

* **boot smoke tests**
* **app health tests**
* **integration tests against real DB**
* **E2E tests against deployed preview or local built app**

Playwright CI docs explicitly support CI browser execution, and Playwright can run across Chromium, Firefox, and WebKit, which is useful for catching browser/runtime-only issues. ([playwright.dev][2])

A minimal runtime gate should assert:

* API starts
* worker starts
* web builds
* `/health` returns OK
* login flow works
* one finance posting happy path works
* one supplier portal happy path works

---

## C. UI/UX mismatch

This is where most ERP teams are weak.

You asked about **UI UX unmatch**.
That means you need 4 different checks, not one:

### 1. Visual regression

Use Playwright screenshot snapshots for:

* dashboard shell
* forms
* tables
* dialogs
* KPI cards
* mobile supplier portal views

Playwright supports screenshot comparison with `toHaveScreenshot()`. ([playwright.dev][3])

### 2. Accessibility regression

Use Playwright ARIA snapshots on key pages:

* login
* nav shell
* AP invoice form
* supplier onboarding wizard
* treasury dashboard

Playwright supports ARIA snapshot comparison of the accessibility tree. ([playwright.dev][4])

### 3. Design-token conformance

Create a custom UI gate that checks:

* only approved semantic tokens are used
* no raw hex colors in app code
* spacing uses token scale
* typography uses approved classes
* forbidden direct component variants are blocked

This is how you stop “Figma drift in code”.

### 4. Route-to-spec conformance

For AFENDA, maintain a route registry:

* route id
* nav group
* permission capability
* page title
* expected breadcrumbs
* expected empty states
* expected primary actions

Then run a gate that validates:

* every nav item resolves to a route
* every route has metadata
* every route has permission mapping
* no dead pages
* no unregistered screens

This is the only real way to catch “UI exists but shell/nav/permission/docs don’t match”.

# 3) Database gate strategy

For your system, DB correctness is not just “migration succeeded”.

It must prove:

## DB Gate 1 — schema compiles

* Drizzle schema imports resolve
* no duplicate table names
* no enum divergence
* generated SQL exists when schema changed

## DB Gate 2 — migration history consistency

Use `drizzle-kit check`.
Drizzle documents this specifically as a way to verify consistency of generated SQL migration history for teams working on different branches. ([Drizzle ORM][5])

## DB Gate 3 — migration generation discipline

Use `drizzle-kit generate` in CI and fail if:

* schema changed but migration not committed
* migration exists but snapshot/meta inconsistent

Drizzle documents `generate`, `migrate`, and migration workflows for this code-first path. ([Drizzle ORM][6])

## DB Gate 4 — clean database migration

Start empty Postgres:

* run migrations up
* run seed-smoke
* run minimal queries
* verify indexes / constraints exist

## DB Gate 5 — forward-compat seeded migration

Start from prior migration baseline with seed data:

* migrate to latest
* run app integration tests
* verify no destructive assumptions

## DB Gate 6 — truth invariants

Custom SQL / test gates:

* append-only tables reject update/delete
* ledger balances
* double-entry equal debit/credit
* org scoping enforced
* no cross-org leakage
* SoD prohibitions enforced
* idempotency keys reject duplicate command replay

For AFENDA, this is one of the most important gates.
Generic test tools will not know your finance truth model.
You need domain gates.

# 4) What “broken points” usually means in a big monorepo

In practice, broken points are often one of these:

* package A changed and package B silently broke
* a schema change broke API serialization
* a route moved and navigation broke
* a component token changed and page layout shifted
* a worker relied on stale contract types
* a migration passed locally but failed on clean DB
* a page renders but wrong capability/empty state/action wiring

So add these custom gates:

## Contract Drift Gate

Fail if:

* API request/response schemas changed without version note
* Zod/contracts changed but client types not regenerated
* backend action payload differs from frontend expectation

## Route Registry Gate

Fail if:

* page file exists but not registered
* nav entry points to dead route
* route metadata missing
* capability mapping missing
* breadcrumb/title mismatch

## Component Policy Gate

Fail if:

* app code imports forbidden primitive directly
* shadcn wrappers bypassed
* raw `<button>` used where design-system component required
* form fields bypass approved field-kit

## Async/Outbox Gate

Fail if:

* command writes domain state but no outbox row
* event emitted outside transaction
* non-idempotent worker handler detected by test replay

# 5) Recommended turbo task graph

Because Turborepo supports task relationships and caching, define CI as **composable tasks**, not shell spaghetti. ([Turborepo][1])

Example:

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "test:unit": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "gate:boundaries": {
      "outputs": []
    },
    "gate:contracts": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "gate:db": {
      "outputs": []
    },
    "test:integration": {
      "dependsOn": ["build", "gate:db"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false,
      "outputs": ["playwright-report/**", "test-results/**"]
    },
    "gate:ui": {
      "dependsOn": ["build"],
      "cache": false,
      "outputs": ["playwright-report/**", "test-results/**"]
    },
    "ci:fast": {
      "dependsOn": [
        "lint",
        "typecheck",
        "gate:boundaries",
        "gate:contracts",
        "test:unit"
      ],
      "outputs": []
    },
    "ci:deep": {
      "dependsOn": [
        "ci:fast",
        "build",
        "gate:db",
        "test:integration",
        "gate:ui"
      ],
      "outputs": []
    }
  }
}
```

Key point:

* **cache static tasks**
* **do not cache e2e/visual gates**
* keep each gate separately diagnosable

Turborepo also supports changed-target execution via filters, useful for PR speed. ([Turborepo][7])

# 6) GitHub Actions configuration pattern

Use **3 workflows**:

## `pr-fast.yml`

Runs on pull request.

* install
* restore pnpm cache
* `turbo run ci:fast --filter=[origin/main...HEAD]`

## `pr-deep.yml`

Runs on pull request after fast gate or on labeled PRs.

* postgres service
* build apps
* run DB/integration/UI gates

## `main-release.yml`

Runs on push to main.

* full build
* full test matrix
* artifact upload
* docker build
* release readiness

Skeleton:

```yaml
name: pr-fast

on:
  pull_request:

concurrency:
  group: pr-fast-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  fast:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run ci:fast --filter='[origin/main...HEAD]'
```

And deep workflow:

```yaml
name: pr-deep

on:
  pull_request:

jobs:
  deep:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: afenda_ci
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U postgres -d afenda_ci"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/afenda_ci
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm drizzle-kit check
      - run: pnpm drizzle-kit migrate
      - run: pnpm turbo run ci:deep
      - run: pnpm exec playwright install --with-deps
```

Playwright’s CI docs explicitly call out installing browsers/deps and running tests in CI. ([playwright.dev][2])

# 7) The custom gates AFENDA should add immediately

This is the part that gives you real competitive leverage.

## Gate RG-01 — Import Direction Law

Custom script parses TS imports and fails on forbidden edges.

## Gate RG-02 — Schema Truth Gate

Fail if:

* contracts changed without db/core follow-through
* db schema changed without migration
* migration changed without snapshot/meta update

## Gate RG-03 — Route Integrity Gate

Fail if:

* every page is not registered
* page metadata missing
* capability not declared
* navigation points to unknown route

## Gate RG-04 — UI Token Gate

Fail if:

* raw color values
* forbidden spacing
* direct component bypass
* non-approved typography

## Gate RG-05 — Empty State / Error State Gate

Every route must declare:

* loading state
* empty state
* error state
* permission denied state

This catches incomplete UX, not just broken UX.

## Gate RG-06 — Finance Invariant Gate

Run deterministic tests for:

* journal balancing
* currency exponent correctness
* rounding rules
* posting date constraints
* period closed behavior
* idempotent repost rejection

## Gate RG-07 — Audit / Evidence Gate

Every state-changing command test must assert:

* audit log exists
* evidence reference exists when required
* actor/org context captured
* no unsafe fields logged

## Gate RG-08 — RLS / Org Isolation Gate

Integration tests attempt cross-org access and must fail.

## Gate RG-09 — Preview Smoke Gate

After build, boot preview and run:

* login
* navigate shell
* submit one form
* background job smoke
* API health

## Gate RG-10 — Visual UX Gate

Playwright screenshot + ARIA snapshots for top 20 screens.
Use this on the shell, dashboards, forms, tables, and portal onboarding. Playwright supports both screenshot and ARIA snapshot testing. ([playwright.dev][3])

# 8) What to test at each layer

Use this test pyramid:

## Unit

Owns:

* money math
* posting validation
* permission decision pure functions
* formatting/parsers
* reducers/mappers

## Integration

Owns:

* repo + DB
* Fastify route + DB
* worker + outbox + DB
* auth + capability resolution
* document registration flow

## E2E

Owns:

* user journeys
* cross-page workflow
* UI/API wiring
* shell/nav correctness
* browser/runtime behavior

## Visual / a11y

Owns:

* layout shift
* token drift
* dialog regression
* missing labels/roles/headings
* table/filter toolbar breakage

# 9) The biggest mistake to avoid

Do **not** make CI a flat pile of 40 commands.

Instead:

* every failure category gets its own named gate
* every gate produces its own artifacts
* every gate has one owner
* every gate has a policy file
* every gate can be run locally

Example local commands:

```bash
pnpm gate:boundaries
pnpm gate:contracts
pnpm gate:db
pnpm test:integration
pnpm test:e2e:smoke
pnpm gate:ui
```

This is how developers stop fearing CI.

# 10) My recommended starter configuration for AFENDA

Start with this exact rollout:

## Phase 1 — must-have now

* lint
* typecheck
* boundary gate
* unit tests
* build
* drizzle check/generate discipline
* clean DB migrate
* Playwright smoke
* route registry gate

## Phase 2 — high value next

* visual regression
* ARIA snapshots
* seeded migration tests
* RLS isolation tests
* outbox/idempotency tests
* audit/evidence assertions

## Phase 3 — enterprise-grade

* bundle budgets
* cross-browser matrix
* concurrency tests
* nightly tortures
* performance budgets
* deploy preview verification

# 11) The honest answer: can CI “fully” detect everything?

No.

CI cannot fully detect:

* all race conditions
* all production-only infra failures
* all human UX judgment issues
* all data-shape surprises from real customers

But a properly designed gate system can detect **most merge-worthy failures** before they hit main:

* static breakage
* architecture drift
* DB drift
* route mismatch
* permission mismatch
* visual regressions
* startup/runtime failures
* truth-model violations

That is the practical win.

# 12) Best AFENDA-specific policy

Your northstar should be:

> **No screen without registry. No command without audit. No schema change without migration. No permission without capability mapping. No merge without proof.**

That one sentence can govern the whole CI architecture.

I can turn this into a **full AFENDA CI Gate Spec** next, with:

* gate IDs
* pass/fail rules
* `turbo.json`
* `package.json` scripts
* GitHub Actions YAML
* Playwright smoke matrix
* Drizzle migration gate
* custom boundary checker structure

[1]: https://turborepo.com/docs/crafting-your-repository/configuring-tasks?utm_source=chatgpt.com "Configuring tasks"
[2]: https://playwright.dev/docs/ci?utm_source=chatgpt.com "Continuous Integration"
[3]: https://playwright.dev/docs/test-snapshots?utm_source=chatgpt.com "Visual comparisons"
[4]: https://playwright.dev/docs/aria-snapshots?utm_source=chatgpt.com "Snapshot testing"
[5]: https://orm.drizzle.team/docs/drizzle-kit-check?utm_source=chatgpt.com "drizzle-kit check"
[6]: https://orm.drizzle.team/docs/drizzle-kit-generate?utm_source=chatgpt.com "Drizzle ORM - `generate`"
[7]: https://turborepo.com/docs/crafting-your-repository/running-tasks?utm_source=chatgpt.com "Running tasks"
