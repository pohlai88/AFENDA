# `@afenda/contracts/src/comm/workflows`

**Domain:** Communication / Workflow Automation  
**Pillar:** `comm`  
**Last Updated:** March 14, 2026

## Ownership

**Primary Owners:** Engineering Team  
**Reviewers:** Product, Engineering

## Scope

This module defines the contract layer for workflow automation:

- **Entities**: Workflow, WorkflowRun
- **Commands**: CreateWorkflow, UpdateWorkflow, ChangeWorkflowStatus, DeleteWorkflow, ExecuteWorkflow, CloneWorkflow, BulkChangeWorkflowStatus, BulkExecuteWorkflows
- **Queries**: GetWorkflow, ListWorkflows, SummarizeWorkflows, GetWorkflowRun, ListWorkflowRuns, SummarizeWorkflowRuns
- **Events**: COMM_WORKFLOW_CREATED, COMM_WORKFLOW_UPDATED, COMM_WORKFLOW_STATUS_CHANGED, COMM_WORKFLOW_DELETED, COMM_WORKFLOW_TRIGGERED, COMM_WORKFLOW_RUN_COMPLETED, COMM_WORKFLOW_RUN_FAILED
- **Enums**: WorkflowTriggerType, WorkflowActionType, WorkflowStatus, ConditionOperator, WorkflowRunStatus

## Exports

```ts
// From workflow.entity.ts
export {
  WorkflowTriggerTypeValues,
  WorkflowActionTypeValues,
  WorkflowStatusValues,
  ConditionOperatorValues,
  WorkflowRunStatusValues,
  WorkflowTriggerSchema,
  WorkflowActionSchema,
  WorkflowSchema,
  WorkflowRunSchema,
  type WorkflowTriggerType,
  type WorkflowActionType,
  type WorkflowStatus,
  type ConditionOperator,
  type WorkflowTrigger,
  type WorkflowAction,
  type Workflow,
  type WorkflowRunStatus,
  type WorkflowRun,
};

// From workflow.commands.ts
export {
  CreateWorkflowCommandSchema,
  UpdateWorkflowCommandSchema,
  ChangeWorkflowStatusCommandSchema,
  DeleteWorkflowCommandSchema,
  ExecuteWorkflowCommandSchema,
  type CreateWorkflowCommand,
  type UpdateWorkflowCommand,
  type ChangeWorkflowStatusCommand,
  type DeleteWorkflowCommand,
  type ExecuteWorkflowCommand,
};

// From workflow.events.ts
export {
  COMM_WORKFLOW_CREATED,
  COMM_WORKFLOW_UPDATED,
  COMM_WORKFLOW_STATUS_CHANGED,
  COMM_WORKFLOW_DELETED,
  COMM_WORKFLOW_TRIGGERED,
  COMM_WORKFLOW_RUN_COMPLETED,
  COMM_WORKFLOW_RUN_FAILED,
  WorkflowEventTypes,
};
```

## Dependencies

- `@afenda/contracts/shared` — OrgIdSchema, PrincipalIdSchema, IdempotencyKeySchema, UtcDateTimeSchema
- `zod` — Schema validation

## Usage

Workflow automation provides trigger-condition-action capabilities for COMM modules:

- **Triggers**: Events from tasks, projects, approvals, meetings, documents
- **Conditions**: Optional field-based filtering before action execution
- **Actions**: Create tasks/action items, send notifications, call webhooks, update fields

## Conventions

- All workflows are org-scoped
- Workflow runs are immutable audit trails
- Workflows support draft → active → paused → archived lifecycle
- Maximum 10 actions per workflow
- Trigger payload is preserved in workflow runs for debugging
