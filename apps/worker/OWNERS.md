# apps/worker — OWNERS

## Purpose
Graphile Worker background job processor. Handles async tasks like GL posting,
document OCR, outbox event processing, and scheduled jobs.

## Import Rules
| May import            | Must NOT import   |
|-----------------------|-------------------|
| `@afenda/contracts`   | `@afenda/ui`      |
| `@afenda/core`        | `react`, `next`   |
| `@afenda/db`          | `fastify`         |
| `graphile-worker`     |                   |

## Belongs Here
- Job task definitions (graphile-worker task functions)
- Outbox polling and event dispatch
- Long-running async operations (OCR, email, PDF generation)

## Does NOT Belong Here
- HTTP route handlers (→ `apps/api`)
- UI components (→ `apps/web` / `@afenda/ui`)
- Schema definitions (→ `@afenda/contracts` / `@afenda/db`)
