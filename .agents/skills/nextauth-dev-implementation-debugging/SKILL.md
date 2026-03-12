---
name: nextauth-dev-implementation-debugging
description: Practical NextAuth/Auth.js development and implementation playbook with end-to-end debugging workflows for Next.js apps.
category: auth
priority: high
---

# NextAuth Dev Implementation and Debugging

Build, verify, and debug NextAuth/Auth.js integrations with production-grade reliability.

This skill focuses on:
- Day-to-day Auth.js development in Next.js App Router projects
- Safe implementation patterns (providers, callbacks, session strategy, route protection)
- Fast debugging loops using API checks, server logs, and E2E tests
- Test strategy inspired by NextAuth Cypress guidance, adapted to modern Playwright-first stacks

## When to Use

Use this skill when you need to:
- Add or refactor `auth.ts`, providers, callbacks, or session behavior
- Debug sign-in, sign-out, redirects, callback loops, or missing sessions
- Validate auth route protection (`middleware`/`proxy` + server checks)
- Add deterministic auth tests (Vitest integration + E2E smoke)
- Triage flaky E2E auth runs in local dev

## Prerequisites

- Next.js app with Auth.js/NextAuth configured
- Environment variables loaded (`AUTH_SECRET`, provider IDs/secrets)
- A stable API base URL in development
- A test database with migrations applied (if using adapter/database sessions)

## Implementation Blueprint

### Step 1: Establish Auth Source of Truth

- Keep authentication decisions in one layer (API/domain or auth provider callbacks), not duplicated in UI actions.
- Ensure server actions call service/API contracts, not custom divergent auth logic.
- Keep response shapes normalized for easier diagnostics.

Checklist:
- [ ] Sign-in and verification are driven by one canonical service
- [ ] Session establishment path is explicit and reusable
- [ ] Error codes/messages are normalized and traceable

### Step 2: Configure Auth.js for Your Runtime

- Prefer a clear `auth.ts` export surface (`handlers`, `auth`, `signIn`, `signOut`).
- Select session strategy intentionally:
  - `jwt`: fewer DB reads, simpler edge support
  - `database`: immediate revocation/sign-out-everywhere support
- Keep callback logic small and deterministic (`jwt`, `session`, `authorized`).

Checklist:
- [ ] `AUTH_SECRET` exists and is stable per environment
- [ ] Callback mutations are minimal and typed
- [ ] Route authorization rules are explicit

### Step 3: Route Protection Contract

Protect at two layers:
- Edge/middleware (`authorized`/proxy guard)
- Server handlers/actions (`auth()` or API guard)

Checklist:
- [ ] Protected routes redirect unauthenticated users
- [ ] Auth pages redirect authenticated users when appropriate
- [ ] Sensitive API mutations reject unauthenticated access

### Step 4: Debuggable Logging Design

Use structured logs for key auth transitions:
- Sign-in attempt
- Sign-in denied/failure reason
- MFA challenge verification request and result
- Session grant verification/consumption
- Invitation/reset-token verification

Log fields:
- `correlationId`
- `route`
- `principalId`/`email` when safe
- `errorCode`
- minimal context (`portal`, `codeLength`, `hasToken`)

Checklist:
- [ ] Failure logs include stable error code
- [ ] Success logs include route + principal context
- [ ] No secrets, passwords, or raw tokens are logged

## Testing Strategy

## Unit/Integration (Vitest)

Create strict tests for:
- AuthFlow result shape (`ok/data` vs `ok/code/message`)
- Unauthorized route guards
- Credential failure normalization
- MFA route logging behavior (spy/assert logger calls)
- Architecture anti-regression checks (e.g., API delegation)

Recommended command:

```bash
pnpm -C apps/api exec vitest run src/__vitest_test__/auth-flows.test.ts
```

## E2E Smoke (Playwright-first)

Inspired by NextAuth Cypress tutorial principles:
- deterministic base URL
- stable auth selectors
- explicit post-login assertions
- avoid cross-origin social login in smoke path unless required

For local stability:
- run smoke spec serially
- use fixed `PLAYWRIGHT_BASE_URL` when server already running
- prefer `waitUntil: "domcontentloaded"` for auth page checks

Recommended command:

```bash
$env:PLAYWRIGHT_BASE_URL='http://localhost:3900'; pnpm -C apps/web exec playwright test e2e/smoke.spec.ts --project=chromium
```

## Cypress Notes (from NextAuth tutorial)

If Cypress is required:
- set base URL and cookie settings correctly
- keep provider/test credentials in `cypress.env.json`
- for social login, configure plugin tasks and provider selectors

Important: In modern Next.js/Auth.js projects, Playwright is generally the default E2E runner; keep Cypress only if your team standard requires it.

## Debugging Playbook

### Symptom: Session exists in API but UI redirects to sign-in

Checks:
- Compare `auth()` server session output with middleware/proxy auth state
- Verify cookie domain/path/secure flags in current environment
- Ensure `AUTH_URL` and app origin are aligned

### Symptom: Login succeeds but protected page immediately bounces

Checks:
- Confirm post-login callback URL normalization
- Verify `authorized` callback/middleware logic is not too broad
- Inspect role/permission claims mapping in `jwt/session` callbacks

### Symptom: MFA verify returns success but no session

Checks:
- Ensure session grant creation happens before redirect
- Verify grant verification endpoint consumes token once
- Assert UI action calls session-establish function before `redirect()`

### Symptom: E2E auth smoke flaky or frame detached

Checks:
- Ensure only one dev server process per port
- Disable full parallel mode for auth smoke spec
- Use deterministic base URL and serial execution
- Check server startup logs for hot-reload crashes or lock contention

### Symptom: Password reset/invite endpoints return 500 in tests

Checks:
- Verify DB schema and migrations are fully applied
- Confirm idempotent migration scripts for missing columns
- Assert route guards return early without double reply

## Verification Checklist

- [ ] Auth API integration tests pass
- [ ] Auth smoke E2E passes in Chromium
- [ ] Structured logs appear for success and failure auth paths
- [ ] No auth secret/token value appears in logs
- [ ] Route protection behavior is deterministic for anonymous vs authenticated users

## Related Skills

- `@nextauth-authentication` for baseline Auth.js setup patterns
- `@vitest` for test authoring and coverage
- `@react-testing-patterns` for UI auth state tests
- `@next-best-practices` for Next.js App Router patterns
