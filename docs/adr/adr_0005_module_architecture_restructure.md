# ADR-0005: Module Architecture Restructure

- **Status:** Proposed
- **Date:** 2026-03-06
- **Author:** Architecture
- **Decision Type:** Repository Architecture / Module System / Scalability

---

## 1. Context

AFENDA has outgrown its early flat domain layout.

The current repository structure preserves the **Import Direction Law** and has served well through the initial finance-first foundation, but it is beginning to show scaling stress as the platform expands into a full ERP, kernel platform, and communication surface.

### What works today

- Strong layer law: `contracts -> db -> core -> api/worker/web`
- Schema-is-truth workflow is already disciplined
- Append-only truth tables, idempotency, outbox, audit, and evidence patterns exist
- CI gate culture is already established
- Finance-first architecture created a strong operational spine

### What no longer scales cleanly

1. **Flat root domains** within packages create a junk-drawer effect.
2. **Kernel concepts are mixed with business domains and infrastructure**.
3. **Finance is treated as a folder, not a module family**.
4. **Routes, jobs, and UI page trees will become crowded quickly**.
5. **No explicit module dependency graph exists within layers**.
6. **Cross-cutting capabilities** such as audit, evidence, outbox, numbering, and idempotency are not grouped under a coherent system kernel.
7. **Future module expansion** (purchasing, sales, CRM, HR, inventory, treasury, manufacturing, communication) will create navigational ambiguity and accidental coupling if the current structure remains flat.

### Architectural problem statement

AFENDA needs a repository tree that:

- preserves the existing layer law,
- supports 20+ modules without package explosion,
- introduces explicit module ownership,
- allows module dependency governance inside a layer,
- cleanly separates **system kernel**, **ERP business modules**, and **communication/collaboration surfaces**,
- remains incremental to migrate,
- and supports future extraction of large modules into standalone packages if needed.

---

## 2. Decision

AFENDA will adopt a **three-pillar module architecture** implemented as **namespace directories inside existing layer packages**, not as many new packages.

The repository will standardize around these architectural pillars:

- `shared/` — universal primitives only
- `kernel/` — system truth capabilities used by all modules
- `erp/` — business application domains
- `comm/` — communication and collaboration surfaces
- `meta/` — UI/runtime metadata only where applicable

This structure will be applied across the relevant layer packages:

- `packages/contracts`
- `packages/db`
- `packages/core`
- `apps/api`
- `apps/worker`
- `apps/web`
- `apps/workflows` (when active)

### Core implementation approach

- **No package explosion**: modules remain directory namespaces inside existing packages.
- **Layer law remains unchanged**: `contracts -> db -> core -> api/worker/web`
- **New module boundary law** is introduced inside layers.
- **Kernel is separated from infra**:
  - `infra/` = pure infrastructure, no domain semantics
  - `kernel/` = operational truth capabilities with domain meaning
- **Communication is event-driven** and must not directly depend on ERP modules.
- **Finance is elevated to a first-class module family** with future-ready submodules.

---

## 3. Architectural Principles

### 3.1 Layer Law remains unchanged

The existing import direction remains the foundation:

```text
contracts -> db -> core -> api/worker/web
```

This ADR does **not** alter that law.

### 3.2 Pillar Law is added inside layers

Within each relevant layer, code is organized by pillar:

```text
shared/
kernel/
erp/
comm/
meta/
```

### 3.3 Shared is strictly limited

`shared/` is reserved for **universal primitives with zero business ownership**.

Allowed examples:
- branded IDs
- money primitives
- datetime primitives
- pagination
- response envelopes
- header constants
- result helpers

Forbidden examples:
- audit vocabulary
- permissions
- domain statuses
- evidence contracts
- event registries with business semantics

### 3.4 Kernel is the system truth engine

`kernel/` contains reusable system capabilities used by all business domains.

Kernel is divided into three internal capability bands:

- `identity/`
- `governance/`
- `execution/`

This prevents `kernel/` from becoming another junk drawer.

### 3.5 ERP is the business module plane

`erp/` contains business domains only.

Examples:
- finance
- purchasing
- supplier
- sales
- inventory
- CRM
- HR
- project
- manufacturing

### 3.6 Comm is event-driven and ERP-decoupled

`comm/` contains communication and collaboration surfaces.

Examples:
- notifications
- inbox
- email
- SMS / WhatsApp
- chatter
- webhooks

`comm/` may depend on `kernel/`, but **must not directly import ERP modules**.
It reacts to ERP state changes through outbox events, entity references, or generic resource descriptors.

### 3.7 Finance is a module family, not a folder

Finance is AFENDA's spine and must be structured as an ERP platform within the ERP plane.

Future-ready namespaces are established now, even if some remain empty initially.

---

## 4. Target Module Dependency Law

### 4.1 Pillar dependency rules

```text
shared: imports nobody
kernel: may import shared
erp: may import shared + kernel
comm: may import shared + kernel
comm: must not import erp
```

### 4.2 ERP module dependency rules

ERP modules may not import one another freely.

Default rule:

> An ERP module may only import another ERP module if that dependency is explicitly declared.

Initial intended graph:

```text
kernel:                no erp, no comm

erp.finance:           kernel only
erp.supplier:          kernel only
erp.crm:               kernel only
erp.purchasing:        kernel + erp.finance + erp.supplier
erp.sales:             kernel + erp.finance + erp.crm
erp.inventory:         kernel + erp.purchasing
erp.hr:                kernel + erp.finance
erp.project:           kernel + erp.hr
erp.manufacturing:     kernel + erp.inventory

comm:                  kernel only
```

### 4.3 Layer + pillar + module = three-dimensional governance

AFENDA will now enforce architecture in three dimensions:

1. **Layer law**
2. **Pillar law**
3. **Module dependency law**

This is the intended long-term scalability model.

---

## 5. Final Repository Shape

## 5.1 `packages/contracts/src/`

```text
src/
├── index.ts
├── shared/
│   ├── index.ts
│   ├── ids.ts
│   ├── money.ts
│   ├── datetime.ts
│   ├── pagination.ts
│   ├── envelope.ts
│   ├── headers.ts
│   ├── result.ts
│   └── sequence.ts
│
├── kernel/
│   ├── index.ts
│   ├── identity/
│   │   ├── index.ts
│   │   ├── organization.entity.ts
│   │   ├── user.entity.ts
│   │   ├── principal.entity.ts
│   │   ├── membership.entity.ts
│   │   ├── role.entity.ts
│   │   └── role-type.ts
│   ├── governance/
│   │   ├── index.ts
│   │   ├── audit/
│   │   │   ├── index.ts
│   │   │   ├── actions.ts
│   │   │   ├── entity-types.ts
│   │   │   └── query.ts
│   │   ├── evidence/
│   │   │   ├── index.ts
│   │   │   ├── evidence.entity.ts
│   │   │   ├── evidence.commands.ts
│   │   │   └── evidence-link.entity.ts
│   │   ├── policy/
│   │   │   ├── index.ts
│   │   │   ├── capability.ts
│   │   │   └── policy-query.ts
│   │   └── settings/
│   │       └── index.ts
│   ├── execution/
│   │   ├── index.ts
│   │   ├── outbox/
│   │   │   ├── index.ts
│   │   │   ├── envelope.ts
│   │   │   └── event-type.ts
│   │   ├── idempotency/
│   │   │   ├── index.ts
│   │   │   └── request-key.ts
│   │   └── numbering/
│   │       ├── index.ts
│   │       └── sequence.entity.ts
│   ├── errors.ts
│   └── permissions.ts
│
├── erp/
│   ├── index.ts
│   ├── finance/
│   │   ├── index.ts
│   │   ├── errors.ts
│   │   ├── permissions.ts
│   │   ├── gl/
│   │   ├── ap/
│   │   ├── ar/
│   │   ├── treasury/
│   │   ├── tax/
│   │   ├── fiscal/
│   │   ├── fx/
│   │   ├── assets/
│   │   ├── lease/
│   │   ├── costing/
│   │   ├── consolidation/
│   │   ├── intercompany/
│   │   └── reporting/
│   ├── supplier/
│   ├── purchasing/
│   ├── sales/
│   ├── inventory/
│   ├── crm/
│   ├── hr/
│   ├── project/
│   └── manufacturing/
│
├── comm/
│   ├── index.ts
│   ├── errors.ts
│   ├── permissions.ts
│   ├── notification/
│   ├── inbox/
│   ├── email/
│   ├── sms/
│   ├── chatter/
│   └── webhook/
│
└── meta/
    ├── index.ts
    ├── entity-def.ts
    ├── field-def.ts
    ├── field-type.ts
    ├── view-def.ts
    ├── action-def.ts
    ├── flow-def.ts
    ├── overlay-def.ts
    └── capability.ts
```

### Notes

- `tenant` is intentionally not retained as the primary architectural noun.
- If compatibility needs it internally, keep it behind implementation details, not as the principal architecture vocabulary.

---

## 5.2 `packages/db/src/schema/`

```text
schema/
├── index.ts
├── _helpers.ts
├── relations/
│   ├── index.ts
│   ├── kernel.ts
│   ├── finance.ts
│   ├── supplier.ts
│   ├── purchasing.ts
│   └── comm.ts
│
├── kernel/
│   ├── index.ts
│   ├── identity.ts
│   ├── governance_audit.ts
│   ├── governance_evidence.ts
│   ├── governance_settings.ts
│   ├── execution_outbox.ts
│   ├── execution_idempotency.ts
│   └── execution_sequence.ts
│
├── erp/
│   ├── index.ts
│   ├── finance/
│   │   ├── index.ts
│   │   ├── gl.ts
│   │   ├── ap.ts
│   │   ├── ar.ts
│   │   ├── treasury.ts
│   │   ├── tax.ts
│   │   ├── fiscal.ts
│   │   ├── fx.ts
│   │   ├── assets.ts
│   │   ├── lease.ts
│   │   ├── costing.ts
│   │   ├── consolidation.ts
│   │   ├── intercompany.ts
│   │   └── reporting.ts
│   ├── supplier.ts
│   ├── purchasing.ts
│   ├── sales.ts
│   ├── inventory.ts
│   ├── crm.ts
│   ├── hr.ts
│   ├── project.ts
│   └── manufacturing.ts
│
└── comm/
    ├── index.ts
    ├── notification.ts
    ├── inbox.ts
    ├── email.ts
    ├── chatter.ts
    └── webhook.ts
```

### Notes

- DB files should be split by **module ownership**, not only by file size.
- `relations.ts` should become a folder immediately once modules expand beyond a few tables.

---

## 5.3 `packages/core/src/`

```text
src/
├── index.ts
│
├── infra/
│   ├── logger.ts
│   ├── env.ts
│   ├── telemetry.ts
│   ├── tracing.ts
│   ├── cache.ts
│   ├── clock.ts
│   └── uuid.ts
│
├── kernel/
│   ├── index.ts
│   ├── identity/
│   │   ├── index.ts
│   │   ├── auth.service.ts
│   │   ├── organization.service.ts
│   │   └── permissions.service.ts
│   ├── governance/
│   │   ├── audit/
│   │   │   ├── index.ts
│   │   │   ├── audit.service.ts
│   │   │   └── audit.queries.ts
│   │   ├── evidence/
│   │   │   ├── index.ts
│   │   │   ├── evidence.registry.ts
│   │   │   ├── evidence.link.ts
│   │   │   └── evidence.policy.ts
│   │   ├── policy/
│   │   │   ├── index.ts
│   │   │   ├── capability-engine.ts
│   │   │   └── resolvers/
│   │   └── settings/
│   │       └── index.ts
│   ├── execution/
│   │   ├── outbox/
│   │   │   ├── index.ts
│   │   │   ├── outbox.service.ts
│   │   │   └── outbox.publisher.ts
│   │   ├── idempotency/
│   │   │   ├── index.ts
│   │   │   └── idempotency.service.ts
│   │   └── numbering/
│   │       ├── index.ts
│   │       └── numbering.service.ts
│
├── erp/
│   ├── index.ts
│   ├── finance/
│   │   ├── index.ts
│   │   ├── money/
│   │   │   ├── arithmetic.ts
│   │   │   ├── allocation.ts
│   │   │   └── fx.ts
│   │   ├── gl/
│   │   │   ├── posting.service.ts
│   │   │   └── gl.queries.ts
│   │   ├── ap/
│   │   │   ├── invoice.service.ts
│   │   │   └── invoice.queries.ts
│   │   ├── ar/
│   │   ├── treasury/
│   │   ├── tax/
│   │   ├── fiscal/
│   │   ├── assets/
│   │   ├── lease/
│   │   ├── costing/
│   │   ├── consolidation/
│   │   ├── intercompany/
│   │   ├── reporting/
│   │   └── __vitest_test__/
│   ├── supplier/
│   ├── purchasing/
│   ├── sales/
│   ├── inventory/
│   ├── crm/
│   ├── hr/
│   ├── project/
│   └── manufacturing/
│
└── comm/
    ├── index.ts
    ├── notification/
    ├── inbox/
    ├── email/
    ├── sms/
    ├── chatter/
    └── webhook/
```

### Notes

- `infra/` is pure infrastructure only.
- Audit, evidence, numbering, idempotency, and capability resolution are not infra; they belong in kernel.

---

## 5.4 `apps/api/src/routes/`

```text
routes/
├── kernel/
│   ├── identity.ts
│   ├── audit.ts
│   ├── evidence.ts
│   └── capabilities.ts
│
├── erp/
│   ├── finance/
│   │   ├── ap.ts
│   │   ├── gl.ts
│   │   ├── treasury.ts
│   │   └── reporting.ts
│   ├── supplier.ts
│   ├── purchasing.ts
│   ├── sales.ts
│   ├── inventory.ts
│   ├── crm.ts
│   ├── hr.ts
│   └── project.ts
│
└── comm/
    ├── notifications.ts
    ├── inbox.ts
    ├── chatter.ts
    └── webhooks.ts
```

---

## 5.5 `apps/worker/src/jobs/`

```text
jobs/
├── kernel/
│   ├── process-outbox-event.ts
│   ├── retry-dead-letter.ts
│   └── cleanup-idempotency.ts
│
├── erp/
│   ├── finance/
│   │   ├── ap/
│   │   │   ├── handle-invoice-submitted.ts
│   │   │   ├── handle-invoice-approved.ts
│   │   │   ├── handle-invoice-rejected.ts
│   │   │   ├── handle-invoice-voided.ts
│   │   │   └── handle-invoice-paid.ts
│   │   ├── gl/
│   │   │   ├── handle-journal-posted.ts
│   │   │   └── handle-journal-reversed.ts
│   │   └── treasury/
│   ├── purchasing/
│   ├── sales/
│   └── inventory/
│
└── comm/
    ├── notification/
    │   └── dispatch-notification.ts
    ├── email/
    │   └── dispatch-email.ts
    └── webhook/
        └── deliver-webhook.ts
```

---

## 5.6 `apps/web/src/app/`

```text
app/
├── layout.tsx
├── page.tsx
├── globals.css
├── global-error.tsx
│
├── (kernel)/
│   ├── admin/
│   ├── auth/
│   └── governance/
│       ├── audit/
│       ├── evidence/
│       └── settings/
│
├── (erp)/
│   ├── finance/
│   │   ├── ap/
│   │   ├── gl/
│   │   ├── treasury/
│   │   └── reporting/
│   ├── suppliers/
│   ├── purchasing/
│   ├── sales/
│   ├── inventory/
│   ├── crm/
│   ├── hr/
│   └── project/
│
└── (comm)/
    ├── inbox/
    ├── notifications/
    └── chatter/
```

---

## 6. Module Manifest Standard

Each major module should declare a lightweight manifest.

Example:

```ts
export const moduleManifest = {
  code: "erp.purchasing",
  pillar: "erp",
  dependsOn: ["kernel", "erp.finance", "erp.supplier"],
  owns: [
    "packages/contracts/src/erp/purchasing/**",
    "packages/db/src/schema/erp/purchasing.ts",
    "packages/core/src/erp/purchasing/**",
    "apps/api/src/routes/erp/purchasing.ts",
  ],
} as const;
```

### Why manifests are adopted

They support:
- CI enforcement
- scaffolder placement
- documentation generation
- ownership linting
- future extraction into standalone packages

This is AFENDA's explicit answer to Odoo-style module dependency declaration, without inheriting addon sprawl.

---

## 7. CI Gate Changes

A new CI gate will be added:

- `tools/gates/module-boundaries.mjs`

### Responsibilities

1. Enforce pillar boundaries:
   - `kernel/` cannot import `erp/` or `comm/`
   - `comm/` cannot import `erp/`
2. Enforce module dependency graph inside `erp/`
3. Enforce optional manifest-driven ownership rules
4. Fail fast on accidental cross-module coupling

### Existing gates to update

- `boundaries.mjs`
- `contract-db-sync.mjs`
- `domain-completeness.mjs`
- `owners-lint.mjs`
- `ui-meta.mjs`
- `run-gates.mjs`
- `scaffold.mjs`

---

## 8. Migration Strategy

Migration will be incremental and low-risk.

### Phase 1 — Introduce target structure

- create pillar folders
- create empty barrels
- create module manifests
- add new CI gate in warning mode initially

### Phase 2 — Move contracts and db

- move contracts into `shared/kernel/erp/comm`
- split DB schemas by ownership
- update barrels and sync gates

### Phase 3 — Move core

- split infra from kernel
- move finance into `erp/finance/*`
- move audit/evidence/idempotency/numbering into `kernel/*`

### Phase 4 — Move app layers

- routes
- jobs
- web route groups
- workflow namespaces

### Phase 5 — Lock governance

- switch module-boundaries gate to enforced mode
- update OWNERS
- update scaffold templates
- update repo docs and Copilot instructions

---

## 9. Consequences

### Positive

- repository tree becomes self-documenting
- kernel vs ERP vs communication concerns become explicit
- finance gets room to scale correctly
- module ownership becomes clearer
- accidental imports are reduced
- scaffolding becomes module-aware
- future package extraction becomes easier
- route/job/page growth remains navigable

### Negative / tradeoffs

- deeper paths increase typing length
- barrel management becomes more important
- migration touches many imports
- CI tooling becomes more sophisticated
- contributors must learn pillar law, not only layer law

### Accepted tradeoff

These costs are acceptable because the current flat structure will create a much larger long-term maintenance tax.

---

## 10. Rejected Alternatives

### A. Keep current flat structure

Rejected because it will not scale to the planned module count and will continue to blur kernel vs business vs communication boundaries.

### B. Create one package per module

Rejected because it creates package explosion, tooling overhead, and operational complexity too early.

### C. Use only layer boundaries, no module boundaries

Rejected because it allows uncontrolled coupling inside layers.

### D. Copy Odoo addon layout directly

Rejected because AFENDA needs stronger compile-time governance and does not want addon sprawl.

---

## 11. Final Decision Statement

AFENDA will restructure the repository into a **layer-preserving, three-pillar module architecture**:

- `shared/` for universal primitives,
- `kernel/` for system truth capabilities,
- `erp/` for business domains,
- `comm/` for communication and collaboration surfaces,
- and `meta/` where UI/runtime metadata applies.

This architecture will be implemented as **namespace directories inside existing packages**, governed by a new **module boundary CI gate**, and supported by **module manifests**, updated **barrels**, updated **scaffolding**, and updated **OWNERS** documentation.

This is the new scalable repository law for AFENDA.

---

## 12. Immediate Follow-up Actions

1. Create `docs/adr/0005-module-architecture.md` from this ADR.
2. Create `tools/gates/module-boundaries.mjs`.
3. Create the empty pillar directories and barrel files.
4. Move `contracts` first.
5. Move `db` second.
6. Move `core` third.
7. Move `api`, `worker`, and `web` after layer internals are stable.
8. Add module manifests.
9. Update scaffolding and CI path discovery.
10. Begin new ERP expansion only after the new structure is active.

