# Policy / Capability Engine

Domain: `packages/core/src/policy/`

## Purpose

Generalised capability evaluation engine that dispatches to per-entity resolvers.
Returns the normalised `CapabilityResult` contract from `@afenda/contracts/meta`.

## Boundary

- Imports from: `@afenda/contracts`, `@afenda/db`, sibling core modules (iam, finance)
- Imported by: `apps/api` (capabilities route), `apps/worker`

## Resolver pattern

Each entity gets a resolver file (`resolvers/<entity>.resolver.ts`) that self-registers
on import via `registerCapabilityResolver()`. The resolver barrel (`resolvers/index.ts`)
imports all resolver files to trigger registration.

## Key files

| File | Purpose |
|---|---|
| `capability-engine.ts` | Engine interface, resolver registry, `resolveCapabilities()` |
| `resolvers/ap-invoice.resolver.ts` | AP Invoice field + action capability resolver |
| `resolvers/index.ts` | Auto-imports all resolvers |
| `index.ts` | Barrel re-export |
