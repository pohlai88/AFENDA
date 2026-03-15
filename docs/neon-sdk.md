## Plan: NeonAuth SDK Closure Backlog

This document is now the active implementation status for the NeonAuth closure backlog.

Last updated: 2026-03-15

## Current Status Summary

- Phase 1 (Governance hardening): Complete.
- Phase 2 (SDK facade completion): Complete for planned server/client wrapper scope.
- Phase 3 (Productization): Complete.
- Phase 4 (Validation and release confidence): Not started.

## Validation Snapshot (2026-03-15)

- Focused Vitest run in apps/web passed:
  - 4 test files
  - 21 tests
  - 0 failures
- Covered suites:
  - organizations coordinator panel orchestration
  - organization mutation panel success/failure/exception callback suppression
  - auth client facade wrappers
  - auth server facade wrappers
	- auth server change-email wrapper capability/unavailable coverage

### TL;DR
Close security gaps first (granular permission hardening), then complete missing SDK facade coverage (server + client), then productize dormant organization/account flows, and finally lock confidence with full route + E2E validation.

### Steps

1. Phase 1: Governance hardening (must come first)
	- [x] Build an operation-permission matrix for internal admin routes.
	- [x] Replace broad route guards with operation-specific permission checks.
	- [x] Extend audit metadata for privileged operations with requiredPermission + target context.
	- [x] Add route tests for deny/allow behavior by permission key.

2. Phase 2: SDK facade completion
	- [x] Expand client facade for missing non-privileged Neon methods/hooks.
	- [x] Keep admin plugin methods server-owned.
	- [x] Replace OTP unknown-cast usage with typed wrappers.
	- [x] Add server organization wrappers for create/update/delete/full-org/invite lifecycle.

3. Phase 3: Productization
	- [x] Replace placeholder organization settings panels with real flows:
	  - apps/web/src/app/(kernel)/governance/settings/organizations/ListOrganizationsClient.tsx
	  - apps/web/src/app/(kernel)/governance/settings/organizations/CreateOrganizationClient.tsx
	  - apps/web/src/app/(kernel)/governance/settings/organizations/InviteMemberClient.tsx
	- [x] Add capability-driven UI gating for organization actions.
	- [x] Add cross-panel refresh orchestration from a shared parent.
	- [x] Add account lifecycle UX for profile update/change email/self-delete/account info behind server-owned endpoints.

4. Phase 4: Validation and release confidence
	- [ ] Extend E2E flows in smoke.spec.ts and admin-api-guards.spec.ts for full auth lifecycle and authenticated admin mutation journeys.
	- [ ] Add deterministic smoke matrix artifact (single command + explicit status + browser summary).
	- [ ] Backfill route Vitest coverage for newly added organization/account endpoints and permission hardening.
	- [ ] Run full verification: web typecheck, web test, web e2e matrix, and repo gates.

## Remaining Work (Validated)

1. Phase 4 confidence work is still open.
	- E2E specs exist but have not been expanded to full authenticated lifecycle/admin mutation journeys.
	- Deterministic smoke matrix artifact is not yet documented as delivered.
	- Full repo verification run (typecheck + tests + E2E matrix + gates) has not been recorded in this tracker.

### Critical Files
- server.ts
- client.ts
- authorization.ts
- route.ts
- permissions.ts
- audit.types.ts
- apps/web/src/app/(kernel)/governance/settings/organizations/page.tsx
- EmailOtpSignInPanel.tsx

### Key Decisions Embedded
1. Privileged admin operations remain server-owned.
2. Permission keys come from contracts vocabulary, not ad-hoc route strings.
3. Security hardening precedes capability expansion.
4. Existing app auth facade stays the external abstraction.

## Next Execution Order

1. Close remaining account lifecycle UX scope (Phase 3).
2. Expand E2E coverage for authenticated lifecycle and admin journeys (Phase 4).
3. Add/complete route-level Vitest backfill for new endpoints and guard permutations.
4. Run full verification and append command outputs to this file.