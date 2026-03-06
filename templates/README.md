# Scaffold Templates

Templates for creating new entities/domains in the AFENDA monorepo.

These are **reference files** — copy, rename, and adapt them when adding a new feature.  
They enforce the schema-is-truth workflow (PROJECT.md §18).

## Usage

When adding a new entity (e.g., `purchase-order`):

```bash
# 1. Copy the contract template
cp templates/entity.contract.template.ts packages/contracts/src/<domain>/<entity>.entity.ts

# 2. Copy the command template  
cp templates/commands.contract.template.ts packages/contracts/src/<domain>/<entity>.commands.ts

# 3. Copy the service template
cp templates/service.template.ts packages/core/src/<domain>/<entity>.service.ts

# 4. Copy the queries template
cp templates/queries.template.ts packages/core/src/<domain>/<entity>.queries.ts

# 5. Copy the route template
cp templates/route.template.ts apps/api/src/routes/<entity>.ts

# 6. Copy the worker handler template
cp templates/worker-handler.template.ts apps/worker/src/jobs/handle-<event>.ts

# 7. Copy the OWNERS.md template
cp templates/OWNERS.template.md packages/<pkg>/<domain>/OWNERS.md
```

Then follow PROJECT.md §12.4 checklist to complete the integration.

## Template inventory

| Template | Creates | Location |
| -------- | ------- | -------- |
| `entity.contract.template.ts` | Zod entity schema | `packages/contracts/src/<domain>/` |
| `commands.contract.template.ts` | Zod command schemas | `packages/contracts/src/<domain>/` |
| `service.template.ts` | Domain service (state machine) | `packages/core/src/<domain>/` |
| `queries.template.ts` | Query functions (cursor pagination) | `packages/core/src/<domain>/` |
| `route.template.ts` | Fastify route (Zod type provider) | `apps/api/src/routes/` |
| `worker-handler.template.ts` | Worker event handler | `apps/worker/src/jobs/` |
| `OWNERS.template.md` | Package/directory ownership doc | any `OWNERS.md` |
