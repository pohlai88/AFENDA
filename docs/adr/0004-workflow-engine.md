# ADR-0004: Workflow Engine — Trigger.dev + React Flow (replacing n8n)

**Status:** Accepted
**Date:** 2026-03-05
**Author:** Architecture
**Supersedes:** §11 (n8n Escalation Plan) in PROJECT.md

---

## 1. Context

PROJECT.md §11 originally planned n8n as the workflow automation layer:

- **Phase 0:** n8n for email ingest, approval notifications, scheduled syncs
- **Phase 1:** Migrate business logic to code; n8n stays for integrations
- **Phase 2:** Optional Temporal if outbox+worker doesn't scale

After completing Sprint 2, the n8n container has been running since Sprint 0 but `apps/n8n/workflows/` remains empty. Meanwhile, the product vision has evolved: we want a **first-class visual workflow builder** embedded in the AFENDA UI — not a bolted-on third-party tool.

## 2. Decision

Replace n8n with a two-layer architecture:

1. **Trigger.dev v3** (OSS, self-hosted) — durable workflow execution engine
2. **React Flow** — visual workflow builder UI embedded in the Next.js app

## 3. Rationale — Why not n8n

| Concern | n8n | Trigger.dev + React Flow |
| --- | --- | --- |
| **Auth** | Separate user system, separate JWT secrets | Uses AFENDA's IAM — same principals, same SoD |
| **Multi-tenancy** | Not org-aware; single-tenant by design | `org_id` on every workflow, same isolation model |
| **Audit trail** | n8n's internal execution log | AFENDA's `audit_log` table, same `correlationId` |
| **Type safety** | Webhook payloads are untyped JSON | Workflow steps receive typed args from `@afenda/contracts` |
| **Domain integration** | HTTP webhooks (network hop, auth needed) | Direct function calls to `@afenda/core` services |
| **UI integration** | Separate admin UI (iframe or external link) | Embedded React Flow canvas, themed with shadcn/ui |
| **Version control** | Workflows in n8n's internal DB; JSON exports are fragile | Workflow definitions stored in Postgres, versioned |
| **Deployment** | Separate Docker container + volume | Runs inside existing worker process (Trigger.dev) or same Railway deployment |
| **Testing** | Manual n8n workflow testing | Unit + integration tests with Vitest |
| **Customization** | Limited to n8n's node types | Build any node type; AP approval, GL posting, email, Slack, custom logic |

## 4. Architecture

### 4.1 Execution engine (Trigger.dev v3)

Trigger.dev is a TypeScript-native durable execution platform:

- **Self-hostable** (fully OSS, Apache-2.0)
- **No separate runtime** — runs as a Node.js process alongside existing services
- **Durable execution** — retries, timeouts, fan-out, sleep, cron
- **TypeScript-first** — workflow definitions are code, inputs/outputs are typed
- **Event-driven** — triggers on outbox events, webhooks, schedules

Each workflow step wraps an existing `@afenda/core` service function:

```typescript
// Example: AP approval workflow step
const approveInvoice = task({
  id: "approve-invoice",
  run: async (payload: { invoiceId: string; principalId: string }) => {
    return core.approveInvoice(db, payload);
  },
});
```

### 4.2 Visual builder (React Flow)

React Flow provides the node-based canvas:

- Pre-built node types: "Submit Invoice", "Approve", "Post to GL", "Send Email", "Wait", "Branch"
- Drag-and-drop palette from `@afenda/contracts` entity types
- Workflow graph serialized as JSON → stored in DB → executed by Trigger.dev
- Themed with shadcn/ui (consistent with AFENDA design system)

### 4.3 Data model

```sql
-- Sprint 4 migration
CREATE TABLE workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id),
  name TEXT NOT NULL,
  description TEXT,
  graph_json JSONB NOT NULL,       -- React Flow serialized graph
  trigger_config JSONB,            -- event type, cron expression, etc.
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | active | archived
  created_by UUID REFERENCES iam_principal(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow(id),
  org_id UUID NOT NULL REFERENCES organization(id),
  status TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed
  trigger_event JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

CREATE TABLE workflow_step (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_run(id),
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed | skipped
  input JSONB,
  output JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT
);
```

## 5. What n8n was going to do — and what replaces it

| n8n use case | Replacement | Sprint |
| --- | --- | --- |
| Email ingest (IMAP → submit invoice) | Worker job: `handle-email-ingest` using `imapflow` library | Sprint 4 |
| Approval notification (email/Slack) | Worker handler: extend `handle-invoice-submitted` with Resend/SES email or Slack webhook | Sprint 3-4 |
| Scheduled syncs (FX rates, bank) | Trigger.dev cron task or Graphile Worker cron | Sprint 5+ |
| Visual workflow editing | React Flow canvas embedded in Next.js | Sprint 5 |

## 6. Migration path

1. ✅ Remove n8n from `docker-compose.dev.yml` (this ADR)
2. ✅ Remove n8n env vars from `.env.example`
3. ✅ Rename `apps/n8n/` → `apps/workflows/` (placeholder)
4. Sprint 4: Add Trigger.dev, DB schema, execution engine
5. Sprint 5: React Flow visual builder

## 7. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Trigger.dev v3 is younger than n8n | It's OSS (Apache-2.0), TypeScript-native, and we only use the execution primitives — easy to swap to Inngest or raw Graphile Worker if needed |
| React Flow adds frontend complexity | We already use React 19 + shadcn/ui; React Flow is the #1 React library for node graphs (26k GitHub stars) |
| Building a workflow engine is scope creep | Strict sprint boundaries: execution engine first (Sprint 4), visual UI later (Sprint 5). Can ship without the visual builder using code-defined workflows |

## 8. Alternatives considered

| Alternative | Rejected because |
| --- | --- |
| **Keep n8n** | Separate auth, not org-aware, can't be embedded in UI, untyped |
| **Temporal** | Too heavy for Day-1 needs; Java SDK is primary; TypeScript support is good but adds significant infra (Temporal Server cluster) |
| **Inngest** | Good TypeScript DX but cloud-first; self-hosting is less mature than Trigger.dev |
| **Windmill** | Excellent OSS workflow engine but Python-first; TypeScript is secondary |
| **Build from scratch** | Durable execution is hard — Trigger.dev gives us retries, timeouts, fan-out for free |
