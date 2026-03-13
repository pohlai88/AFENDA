import type { Task } from "graphile-worker";
import { createDb, executeWorkflowActions, getWorkflowById } from "@afenda/core";
import type { DbClient } from "@afenda/db";
import type { CommWorkflowId, CommWorkflowRunId, OrgId } from "@afenda/contracts";

let _db: DbClient | null = null;

function getDb(): DbClient {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[workflow-triggered] DATABASE_URL not set");
  ({ db: _db } = createDb(url));
  return _db;
}

export const handleWorkflowTriggered: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      workflowId: string;
      runId: string;
      orgId: string;
    };
  };

  if (event.type !== "COMM.WORKFLOW_TRIGGERED") {
    helpers.logger.warn(`handle_workflow_triggered received unexpected event type: ${event.type}`);
    return;
  }

  const db = getDb();
  const orgId = event.payload.orgId as OrgId;
  const workflowId = event.payload.workflowId as CommWorkflowId;
  const runId = event.payload.runId as CommWorkflowRunId;

  const workflow = await getWorkflowById(db, orgId, workflowId);
  if (!workflow) {
    helpers.logger.warn(
      `workflow triggered execution skipped: workflowId=${workflowId} runId=${runId} reason=workflow_not_found`,
    );
    return;
  }

  await executeWorkflowActions(db, { activeContext: { orgId } }, runId, workflow.actions);

  helpers.logger.info(
    `workflow actions executed: workflowId=${workflowId} runId=${runId} actions=${workflow.actions.length} correlationId=${event.correlationId}`,
  );
};
