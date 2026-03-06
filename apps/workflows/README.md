# apps/workflows

Future home of the AFENDA workflow engine — a first-class visual workflow builder integrated into the product.

> **See:** [ADR-0004](../../docs/adr/0004-workflow-engine.md) for the architecture decision.

## Status

**Sprint 4+ (planned).** No code here yet. This directory is a placeholder.

## Architecture (planned)

| Layer | Technology | Role |
| --- | --- | --- |
| **Execution engine** | Trigger.dev v3 (OSS, self-hosted) | Durable workflow execution with retries, fan-out, sleep, cron |
| **Visual builder** | React Flow + shadcn/ui | Node-based canvas for building workflows visually |
| **Storage** | Postgres (same DB) | `workflow`, `workflow_run`, `workflow_step` tables |
| **Domain integration** | Direct function calls | Workflow steps call `@afenda/core` services (typed, tested) |

## Why not n8n?

See ADR-0004 §3 for the full rationale. Summary:

- n8n has its own auth system — doesn't integrate with AFENDA's IAM
- n8n is not org-aware — no `org_id` isolation
- n8n workflows live outside the codebase (internal DB) — hard to version-control
- n8n's UI can't be embedded or themed to match AFENDA's design system
- Webhook payloads are untyped JSON — no contract safety

## Planned Sprint breakdown

| Sprint | Deliverable |
| --- | --- |
| **Sprint 4** | DB schema (`workflow`, `workflow_run`, `workflow_step`), Trigger.dev integration, execution engine, API routes |
| **Sprint 5** | React Flow canvas, node palette (AP approval, GL posting, email, Slack), save/load, trigger config |
| **Sprint 6** | Pre-built templates (AP approval flow, email ingest, bank reconciliation trigger), marketplace UI |

## Directory structure (planned)

```
apps/workflows/
  README.md          ← this file
  package.json       ← Sprint 4
  src/
    engine/          ← workflow execution runtime
    triggers/        ← event triggers (outbox, cron, webhook)
    steps/           ← step definitions wrapping @afenda/core services
```
