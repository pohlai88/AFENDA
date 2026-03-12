# HR UI Auto-Generation Evaluation (from AP domain)

Date: 2026-03-11
Scope: Learn from AP UI delivery pattern and apply to HR Wave 1-4 web scaffold.

## Objective

Use AP domain web implementation as the reference pattern for HR UI auto-generation/scaffolding, instead of ad-hoc page creation.

## AP pattern observed

Reference area: `apps/web/src/app/(erp)/finance/ap/`

1. Route-first decomposition:
- Each business screen is a Next.js route segment with dedicated `page.tsx`.
- Dynamic details use nested route params (`[id]`) and route-local composition.

2. State triad per segment:
- `page.tsx` for primary rendering.
- `loading.tsx` for skeleton/loading contract.
- `error.tsx` as client boundary with retry + fallback navigation.

3. Server-first data orchestration:
- Server routes fetch initial data via shared client (`apps/web/src/lib/api-client.ts`).
- Client wrappers manage interaction (sort/filter/pagination/actions) when required.

4. Shared typed API facade:
- API utility layer centralizes headers, auth forwarding, and endpoint contracts.
- Screen-level code consumes facade methods, not raw `fetch` scatter.

5. Reusable shell/UI primitives:
- `@afenda/ui` primitives and generated components (`GeneratedList`, `GeneratedForm`) are preferred.
- Domain pages compose these primitives rather than raw HTML controls.

## HR implementation applied from AP pattern

Implemented under `apps/web/src/app/(erp)/hr/`:

- Full route scaffold for Section 14 screen inventory:
  - People
  - Organization
  - Recruitment
  - Onboarding
- Segment-level state triad:
  - `loading.tsx` + `error.tsx` at `hr/`, `hr/people`, `hr/organization`, `hr/recruitment`, `hr/onboarding`.
- Shared HR web utilities (AP-style):
  - `apps/web/src/app/(erp)/hr/shared/hrm-client.ts`
  - `apps/web/src/app/(erp)/hr/shared/hrm-query-keys.ts`
- Reusable HR page scaffold components:
  - `apps/web/src/app/(erp)/hr/shared/components/HrmScreen.tsx`
  - `apps/web/src/app/(erp)/hr/shared/components/HrmSectionError.tsx`

## Gaps versus AP "full generated" maturity

1. Metadata registry coverage:
- AP uses mature metadata entities in `packages/ui/src/meta/entities/*`.
- HR entity metadata is not yet registered in `packages/ui/src/meta/registry.ts`.

2. Generated list/form binding:
- HR pages are scaffolded and renderable, but not yet wired to `GeneratedList`/`GeneratedForm` with HR entity keys.

3. Capability-driven action orchestration:
- AP clients load capabilities and apply action controls.
- HR route stubs currently prioritize route/state closure first.

## Recommended next increment (to reach AP-level auto-generation)

1. Add HR entity registrations to UI metadata registry:
- `hr.employee`, `hr.position`, `hr.requisition`, `hr.application`, `hr.onboardingPlan`, `hr.separationCase`.

2. Replace scaffold cards with generated surfaces:
- Employee List -> `GeneratedList`.
- Hire/Transfer/Terminate forms -> `GeneratedForm`.
- Detail pages -> Record workspace + metadata-based field maps.

3. Add capability contract integration:
- Fetch and apply capabilities per HR entity/action set.

4. Introduce route-level client wrappers only where interaction is needed:
- Keep server-first fetch for initial payload.

## Outcome

HR now follows AP's route/state scaffolding discipline and shared API-utility style.
The next step is metadata registration + generated component binding to complete true AP-grade auto-generated HR UX.
