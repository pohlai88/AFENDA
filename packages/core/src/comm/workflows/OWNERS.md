# Workflows Module — Core Services

## Exports

### Services (Commands)

- `createWorkflow(db, ctx, policyCtx, correlationId, params)` — Create new workflow
- `updateWorkflow(db, ctx, policyCtx, correlationId, params)` — Update workflow configuration
- `changeWorkflowStatus(db, ctx, policyCtx, correlationId, params)` — Change workflow status (draft/active/paused/archived)
- `deleteWorkflow(db, ctx, policyCtx, correlationId, params)` — Delete workflow
- `executeWorkflow(db, ctx, policyCtx, correlationId, params)` — Manually execute workflow
- `evaluateTriggerConditions(trigger, payload)` — Evaluate trigger conditions against payload
- `executeWorkflowActions(db, ctx, runId, actions)` — Execute workflow actions (called by worker)

### Queries

- `listWorkflows(db, orgId, filters?)` — List workflows with optional status filter
- `getWorkflowById(db, orgId, workflowId)` — Get single workflow by ID
- `listWorkflowRuns(db, orgId, workflowId, filters?)` — List runs for a workflow
- `getWorkflowRunById(db, orgId, runId)` — Get single run by ID
- `listActiveWorkflowsByTriggerType(db, orgId, triggerType)` — List active workflows matching trigger type

### Types

- `WorkflowPolicyContext` — Authentication context with principalId
- `WorkflowServiceResult<T>` — Service result type (ok/error)
- `WorkflowRow` — Workflow query result
- `WorkflowRunRow` — Workflow run query result

## Event Flow

1. Commands emit outbox events (COMM_WORKFLOW_CREATED, etc.)
2. Worker handlers listen for trigger events from other modules
3. Worker evaluates conditions and executes actions
4. Run completion/failure events emitted to outbox

## Trigger Types

- task.created, task.updated, task.status_changed
- project.created, project.status_changed
- approval.submitted, approval.decided
- resolution.created, resolution.voted, resolution.passed
- meeting.scheduled, meeting.completed
- document.created, document.published

## Action Types

- create_task, send_notification, send_email, send_webhook, call_webhook, update_field

## Dependencies

- `@afenda/db` — Database client, schema tables
- `@afenda/contracts` — Commands, event types, IDs
- `../../kernel/governance/audit/audit.js` — withAudit wrapper
- `drizzle-orm` — Query builder (eq, and, sql)
