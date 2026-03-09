# Scaffold Templates

Templates for creating new entities/domains in the AFENDA monorepo.

These are **reference files** — copy, rename, and adapt them when adding a new feature.  
They enforce the schema-is-truth workflow (PROJECT.md §18).

## Architecture — Pillar Paths (ADR-0005)

All new files must be placed under the correct **pillar** directory:

| Pillar | Purpose | Example paths |
| ------ | ------- | ------------- |
| `shared/` | Universal primitives (3+ domains) | `contracts/src/shared/` |
| `kernel/` | System truth capabilities | `contracts/src/kernel/identity/`, `core/src/kernel/governance/` |
| `erp/` | Business domains | `contracts/src/erp/finance/ap/`, `core/src/erp/finance/ap/` |
| `comm/` | Communication surfaces | `contracts/src/comm/`, `core/src/comm/` |

## Usage

When adding a new ERP entity (e.g., `purchase-order` under `erp/purchasing`):

```bash
# 1. Copy the contract template
cp templates/entity.contract.template.ts packages/contracts/src/erp/<module>/<entity>.entity.ts

# 2. Copy the command template  
cp templates/commands.contract.template.ts packages/contracts/src/erp/<module>/<entity>.commands.ts

# 3. Copy the service template
cp templates/service.template.ts packages/core/src/erp/<module>/<entity>.service.ts

# 4. Copy the queries template
cp templates/queries.template.ts packages/core/src/erp/<module>/<entity>.queries.ts

# 5. Copy the route template
cp templates/route.template.ts apps/api/src/routes/erp/<module>/<entity>.ts

# 6. Copy the worker handler template
cp templates/worker-handler.template.ts apps/worker/src/jobs/erp/<module>/handle-<event>.ts

# 7. Copy the OWNERS.md template
cp templates/OWNERS.template.md packages/<pkg>/src/<pillar>/<module>/OWNERS.md
```

Then follow PROJECT.md §12.4 checklist to complete the integration.

## Template inventory

| Template | Creates | Location |
| -------- | ------- | -------- |
| `entity.contract.template.ts` | Zod entity schema | `packages/contracts/src/<pillar>/<module>/` |
| `commands.contract.template.ts` | Zod command schemas | `packages/contracts/src/<pillar>/<module>/` |
| `service.template.ts` | Domain service (state machine) | `packages/core/src/<pillar>/<module>/` |
| `queries.template.ts` | Query functions (cursor pagination) | `packages/core/src/<pillar>/<module>/` |
| `route.template.ts` | Fastify route (Zod type provider) | `apps/api/src/routes/<pillar>/<module>/` |
| `worker-handler.template.ts` | Worker event handler | `apps/worker/src/jobs/<pillar>/<module>/` |
| `OWNERS.template.md` | Package/directory ownership doc | any `OWNERS.md` |
