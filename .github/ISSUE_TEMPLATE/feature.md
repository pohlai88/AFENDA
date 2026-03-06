---
name: Feature Request
about: Propose a new feature or enhancement
title: "[FEATURE] "
labels: enhancement
---

## Problem

<!-- What problem does this solve? Who is affected? -->

## Proposed solution

<!-- Describe the desired outcome. -->

## Affected packages

<!-- Which packages/apps will be touched? Follow the schema-is-truth order. -->

- [ ] `packages/contracts` — Zod schemas
- [ ] `packages/db` — Drizzle schema + migration
- [ ] `packages/core` — Domain service
- [ ] `apps/api` — API route
- [ ] `apps/worker` — Event handler
- [ ] `apps/web` — UI
- [ ] `packages/ui` — Design system component
- [ ] `tools/gates` — CI gate

## Checklist before implementation

- [ ] Reviewed PROJECT.md §12.4 (new entity checklist) if adding an entity
- [ ] Checked existing error codes in `contracts/shared/errors.ts`
- [ ] Identified audit actions needed
- [ ] Confirmed no scope creep beyond Day-1 thin slice (PROJECT.md §21)

## Alternatives considered

<!-- Other approaches you considered and why you rejected them. -->
