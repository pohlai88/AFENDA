# apps/api — OWNERS

## Purpose
Fastify HTTP API server. Routes, middleware, and request/response handling.

## Import Rules
| May import            | Must NOT import   |
|-----------------------|-------------------|
| `@afenda/contracts`   | `@afenda/db`      |
| `@afenda/core`        | `@afenda/ui`      |
| `fastify`             | `react`, `next`   |

## Belongs Here
- Fastify route handlers and plugins
- Request validation (using contracts schemas)
- Middleware (auth, rate-limit, correlation ID)
- Health/readiness endpoints

## Does NOT Belong Here
- Direct DB queries (→ use `@afenda/core` services instead)
- Zod schema definitions (→ `@afenda/contracts`)
- Background job processing (→ `apps/worker`)
