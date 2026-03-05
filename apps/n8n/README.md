# apps/n8n

This directory holds n8n workflow exports and configuration for AFENDA-NEXUS.

n8n runs as a Docker service — defined in `/docker-compose.dev.yml` — and is **not** a Node.js application. No `package.json` lives here.

## Local service

| Detail        | Value                          |
|---------------|-------------------------------|
| Version (dev) | 2.9.4                         |
| URL           | http://localhost:5678          |
| Data volume   | `afenda_n8n` (Docker volume)  |
| Depends on    | `postgres` (healthy)          |

## Workflow directory

Workflow JSON exports go here so they can be version-controlled and re-imported after container rebuilds.

```
apps/n8n/
  README.md          ← this file
  workflows/         ← export .json files here (git-tracked)
    .gitkeep
```

## Export / import

**Export** all workflows from the n8n UI:
`Settings → Import/Export → Export all workflows`

Save the file to `apps/n8n/workflows/<slug>.json`.

**Import** on a fresh instance:
`Settings → Import/Export → Import from file`

## Sprint 0 purpose

n8n is **edge-only** in this architecture. It is not used for core business logic. Workflows are triggered only after the Postgres outbox event has been committed and processed by `apps/worker`.

Planned edge workflows:

| Workflow          | Sprint | Trigger                        |
|-------------------|--------|-------------------------------|
| Invoice due alert | 1      | Outbox `invoice.due_soon`     |
| Xero sync         | 2      | Outbox `journal.posted`       |
| Slack approval    | 2      | Outbox `invoice.pending_approval` |

## Environment variables (set in n8n container via docker-compose)

| Variable              | Purpose                                 |
|-----------------------|-----------------------------------------|
| `N8N_PORT`            | Port override (default 5678)            |
| `N8N_BASIC_AUTH_*`    | Basic auth (dev only, disable in prod)  |
| `DB_TYPE=postgresdb`  | Persist workflows to Postgres           |
| `DB_POSTGRESDB_*`     | Postgres connection details             |
| `WEBHOOK_URL`         | Public URL for webhook triggers         |

See `.env.example` in the repo root for all `N8N_*` variables.
