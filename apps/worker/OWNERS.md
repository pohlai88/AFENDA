# apps/worker — OWNERS

## Purpose

Graphile Worker background job processor. Handles async tasks triggered by
outbox events via PostgreSQL `LISTEN/NOTIFY`.

## Import Rules

| May import          | Must NOT import |
| ------------------- | --------------- |
| `@afenda/contracts` | `@afenda/ui`    |
| `@afenda/core`      | `react`, `next` |
| `@afenda/db`        | `fastify`       |
| `graphile-worker`   |                 |

## File Inventory

### Entry

| File | Description |
|---|---|
| `src/index.ts` | Task registry, env validation, graceful shutdown |

### Job handlers (`src/jobs/`)

| File | Triggered by | Does |
|---|---|---|
| `kernel/process-outbox-event.ts` | Outbox poller | Reads outbox event and dispatches to domain handlers |
| `erp/finance/ap/handle-invoice-submitted.ts` | `invoice.submitted` | Sends submission notification (stub) |
| `erp/finance/ap/handle-invoice-approved.ts` | `invoice.approved` | Queues GL posting job |
| `erp/finance/ap/handle-invoice-rejected.ts` | `invoice.rejected` | Notifies submitter (stub) |
| `erp/finance/ap/handle-invoice-voided.ts` | `invoice.voided` | Cleanup / notification (stub) |
| `erp/finance/ap/handle-invoice-paid.ts` | `invoice.paid` | Reconciliation trigger (stub) |
| `erp/finance/gl/handle-journal-posted.ts` | `gl.journal_posted` | Updates projection tables |
| `erp/finance/gl/handle-journal-reversed.ts` | `gl.journal_reversed` | Updates projection tables |

### Stub job directories (no handlers yet)

| Directory | Status |
|---|---|
| `jobs/comm/email/` | ← stub — email jobs (Sprint 5+) |
| `jobs/comm/notification/` | ← stub — push notification jobs (Sprint 5+) |
| `jobs/comm/webhook/` | ← stub — outgoing webhook jobs (Sprint 5+) |

> **Missing handlers** (documented in PROJECT.md §19): dead-letter retry and
> idempotency cleanup workers are not yet implemented. Add them as:
> `kernel/retry-dead-letter.ts` and `kernel/cleanup-idempotency.ts`.

## Belongs Here

- Job task definitions (graphile-worker task functions)
- Outbox polling and event dispatch
- Long-running async operations (email, PDF generation, bank import)

## Does NOT Belong Here

- HTTP route handlers (→ `apps/api`)
- UI components (→ `apps/web` / `@afenda/ui`)
- Schema definitions (→ `@afenda/contracts` / `@afenda/db`)
