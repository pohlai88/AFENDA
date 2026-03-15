# COMM Contracts Upgrade Guideline

## Purpose

This guideline standardizes architecture and code quality across `packages/contracts/src/comm` using the announcements module upgrade as the reference implementation.

Reference implementation files:

- `announcements/announcement.entity.ts`
- `announcements/announcement.commands.ts`
- `announcements/announcement.queries.ts`
- `announcements/announcement.events.ts`
- `announcements/announcement.events.payloads.ts`
- `announcements/announcement.outbox.ts`
- `announcements/index.ts`
- `announcements/__vitest_test__/*`

## Scope

Apply this guideline to all comm submodules:

- `approvals`
- `boardroom`
- `chatter`
- `docs`
- `projects`
- `tasks`
- `workflows`

## Architecture Standard (Target Shape Per Module)

Each comm module must converge to this structure:

1. `*.entity.ts`

- Canonical persisted entity schemas and types.
- Use reusable refinement helpers for cross-field rules.
- Keep default values deterministic and explicit.

2. `*.commands.ts`

- Mutation DTO schemas only.
- Use `idempotencyKey` for write commands.
- Prefer discriminated unions over manual branch checks when command variants are keyed by a discriminator.
- Use `superRefine` only for cross-field constraints.

3. `*.queries.ts`

- Read DTO schemas and response schemas.
- Use shared query primitives from `comm/shared/query.ts`.
- Use shared response factories from `comm/shared/response.ts`.
- Provide explicit `Get`, `List`, `Search` response schemas where applicable.
- Standardize pagination via shared builders (for example `makePaginationSchema(cursorSchema)`) instead of per-module ad-hoc pagination shapes.

4. `*.events.ts`

- Event constants with stable names (`COMM.<ENTITY>_<ACTION>`).
- A typed event registry object (for example `CommXEvents`).
- A union event type derived from the registry.
- An append-only aggregate event list (for example `XEventTypes`) used by outbox validation.
- Re-export payload schemas/types from `*.events.payloads.ts`.

5. `*.events.payloads.ts` (required for modules with emitted events)

- One payload schema per event.
- Shared sub-schemas for repeated structures.
- Export both schema aliases and inferred types.

6. `*.outbox.ts` (required for modules with emitted events)

- Generic outbox record schema.
- Module-specific outbox record schema with event-aware payload validation.
- `switch` by event name and validate payload schema per event.

7. `index.ts`

- Barrel exports only.
- Export every module contract file explicitly, including payload/outbox files.

8. `__vitest_test__/`

- At minimum one test file per source contract file in the module.
- Include an `index.test.ts` barrel smoke test.

## Event Contract Rules

1. Event names are immutable API contracts

- Add new events.
- Do not rename existing events.
- Do not remove existing events without a versioned deprecation plan.

2. Aggregate event list is append-only

- Keep ordering stable.
- Append new event types at the end.

3. Payload schemas must be explicit

- No `z.unknown()` payloads for module-specific events.
- Use strongly typed ids (`OrgIdSchema`, branded ids, etc.).
- Include `correlationId` in event payload when part of the domain event shape.

4. Outbox schema must validate by event type

- Parse and report nested payload issues with clear paths.
- Cover all module events in the `switch`.

## Schema Quality Rules

1. IDs and times

- Use shared id/time schemas (`shared/ids`, `shared/datetime`).
- Avoid ad-hoc string/date shapes when a shared schema exists.

2. Cross-field validation

- Keep each rule in reusable helper functions where possible.
- Avoid duplicated refinement blocks across create/update/entity schemas.

3. Command update semantics

- Ensure update commands enforce "at least one mutable field".
- Enforce pair requirements where fields must appear together.

4. Response consistency

- Use shared response factories:
  - `makeCommDetailResponseSchema`
  - `makeCommListResponseSchema`
  - `makeCommSearchResponseSchema`

## Maintainability and Quality Refinements

These refinements are mandatory for upgraded modules and are based on recent boardroom and API hardening work.

1. DRY first (eliminate duplication)

- Promote repeated schema patterns to module-level shared files (for example `*.shared.ts` or `schema.helpers.ts`).
- Reuse helper compositors for refinements/defaults instead of copying `superRefine` blocks.
- Reuse event payload sub-schemas across related events.
- Reuse invariant evaluators in both contracts and runtime service adapters when the same rule appears in multiple commands.

2. Consistent naming

- Keep schema/type names aligned by responsibility:
  - Text/value primitives: `XTextSchema`, `XStatusSchema`
  - Command field groups: `XCommandFieldsSchema`
  - Validators/helpers: `addXIssue`, `withXRefinement`, `getXViolation`
- Use suffix consistency by artifact type:
  - `XSchema` for generic schemas
  - `XPayloadSchema` for event payload schemas
  - `XEventTypes` for append-only event arrays
  - `XEvents` for event registry maps
- Use stable error-code naming with explicit state semantics (for example `*_IS_*` for guard-state violations).
- Prefer one canonical term per concept module-wide (avoid mixed synonyms for the same state/action).

3. Organized imports

- Keep imports grouped in this order:
  1. External libraries
  2. Shared monorepo contracts/utilities
  3. Same-module files
  4. Type-only imports separated when practical
- Avoid deep, duplicated relative import chains by using local barrels where appropriate.
- Remove dead imports immediately after refactors.

4. Invariant strategy standard

- Model multi-command state constraints in a reusable invariant helper (for example `getXCommandGuardViolation`).
- Treat invariant helpers as contracts-level policy, then adapt in runtime layers without duplicating rule logic.
- Ensure invariant outputs are deterministic and actionable (`code` + user-facing `message`).

5. Export surface clarity

- Group related exports in each file (`schemas`, `types`, `constants`, `helpers`).
- Ensure `index.ts` barrels expose the intended public API only; avoid leaking transient/internal helpers unless intentionally reusable.
- Keep event-related exports predictable: constants, registry, union type, event list, payload schemas/types.

6. Future-proofing rules

- Prefer additive evolution:
  - Append to event arrays.
  - Add fields as optional first when evolving payloads.
  - Introduce new constants/types instead of mutating existing contract semantics.
- Add compatibility comments for non-obvious constraints (for example append-only ordering, immutable names).
- Design helpers so new statuses/actions can be extended in one place.

7. Refactor safety

- During renames/reorg, update tests and barrels in the same PR.
- Keep runtime and contracts naming synchronized to avoid export collisions.
- Validate touched modules with targeted tests before broad workspace checks.

## Module Refactor Checklist Template

Use this checklist per module (`approvals`, `boardroom`, `chatter`, `docs`, `projects`, `tasks`, `workflows`) to track migration readiness.

1. Structure and exports

- `*.entity.ts` exists and contains canonical persisted schemas.
- `*.commands.ts` exists and enforces idempotency/update semantics.
- `*.queries.ts` exists and uses shared query/response helpers.
- `*.events.ts` has constants + typed registry + append-only event list.
- `*.events.payloads.ts` exists for emitted events.
- `*.outbox.ts` exists for emitted events and validates by event type.
- `index.ts` exports all intended public contracts.

2. Quality and DRY

- Duplicate refinements are consolidated into shared helpers.
- Pagination shape is shared (no local duplicated pagination DTOs).
- Naming follows suffix conventions (`XSchema`, `XPayloadSchema`, `XEvents`, `XEventTypes`).
- Imports are grouped and dead imports removed.

3. Safety and future-proofing

- Existing event names unchanged.
- Event lists append-only and ordering stable.
- Evolved payload fields introduced additively.
- Guard/invariant behavior is deterministic (`code` + `message`).

4. Test completion

- Source files mirrored by `__vitest_test__` coverage.
- Outbox/event mismatch tests included.
- Barrel smoke test included.
- Negative refinement tests included.

## Priority Rollout Guidance

Recommended first wave for optimization impact:

1. `approvals`
2. `tasks`

Rationale:

- These modules typically carry dense command/event transitions.
- They benefit most from invariant helper extraction and outbox hardening.
- They provide reusable patterns for the remaining modules.

## Testing Standard (Definition of Done)

For each comm module, tests must cover:

1. Entity

- Valid minimal and full payloads.
- Cross-field invalid states.

2. Commands

- Happy paths for each command variant.
- Required-field and cross-field negative cases.

3. Queries

- Defaults and bounds.
- Date order refinements.
- Response schema parse checks.

4. Events

- Constant stability and list membership.
- Registry and union type surface checks where practical.

5. Event payloads

- One positive parse test per payload schema.
- Negative tests for required field failures.

6. Outbox

- Valid event/payload parse for all event types.
- Invalid payload rejected for event type mismatch.

7. Barrel

- `index.ts` exports resolve and include expected symbols.

8. Maintainability checks

- Shared helpers are used where duplicate rules previously existed.
- Naming remains consistent across schema, type, event, and error-code layers.
- Import groups remain ordered and free of stale entries.
- New rules are extensible without editing multiple unrelated files.

## COMM-Wide Rollout Plan

Phase 1: Inventory and gap report

1. For each module, list whether `*.events.payloads.ts` exists.
2. For each module, list whether `*.outbox.ts` exists.
3. For each module, compare source files vs `__vitest_test__` coverage.

Phase 2: Event contract normalization

1. Add typed event registries where missing.
2. Add append-only `*EventTypes` arrays where missing.
3. Add payload schema modules.

Phase 3: Outbox hardening

1. Add module-specific outbox schema files.
2. Add event-aware payload validation.
3. Ensure each module participates in comm outbox sync tests.

Phase 4: Query/response consistency

1. Replace ad-hoc response shapes with shared response builders.
2. Add missing detail/list/search response schemas.

Phase 5: Test completeness

1. Add missing test files for every source contract file.
2. Run module-targeted vitest suites.

Phase 6: Maintainability hardening

1. Consolidate duplicate schema/refinement logic into shared helpers.
2. Normalize naming and import ordering across the module.
3. Add invariant-guard tests for stateful command restrictions.
4. Verify barrel exports are intentional and collision-free.

## Mandatory Review Checklist (Per PR)

1. All module files exported by `index.ts`.
2. New events appended (not inserted or renamed).
3. Payload schema exists for every emitted event.
4. Outbox schema validates every event payload path.
5. Query response schemas use shared response builders.
6. Cross-field refinements are covered by negative tests.
7. Test directory mirrors source coverage.
8. Duplicate rule logic is consolidated into shared helpers (DRY).
9. Naming conventions are consistent for schemas/types/errors/events.
10. Import ordering is clean and dead imports are removed.
11. Invariant guard behavior is tested for all restricted states/actions.

## Suggested Command Pattern for Validation

Run targeted module tests explicitly (Windows-safe pattern):

`pnpm --filter @afenda/contracts exec vitest run <explicit test file paths>`

## Implementation Notes

- Announcements is the baseline for "upgraded" comm module quality.
- Other comm modules should be migrated incrementally, module by module, preserving event backward compatibility.
- Avoid broad cross-module rewrites in one PR; keep rollouts auditable and reversible.
