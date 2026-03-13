import type { Helpers } from "graphile-worker";

type InboxEntityType =
  | "task"
  | "project"
  | "approval_request"
  | "document"
  | "board_meeting"
  | "announcement";

type InboxDispatch = {
  orgId: string;
  principalId: string;
  eventType: string;
  entityType: InboxEntityType;
  entityId: string;
  title: string;
  body?: string | null;
};

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function createInboxItem(helpers: Helpers, dispatch: InboxDispatch): Promise<void> {
  await helpers.withPgClient(async (pgClient) => {
    await pgClient.query(
      `INSERT INTO comm_inbox_item
         (org_id, principal_id, event_type, entity_type, entity_id, title, body)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        dispatch.orgId,
        dispatch.principalId,
        dispatch.eventType,
        dispatch.entityType,
        dispatch.entityId,
        dispatch.title,
        dispatch.body ?? null,
      ],
    );
  });
}

export async function createInboxItems(
  helpers: Helpers,
  dispatches: readonly InboxDispatch[],
): Promise<number> {
  const dispatchMap = new Map<string, InboxDispatch>();
  for (const dispatch of dispatches) {
    const key = `${dispatch.orgId}|${dispatch.principalId}|${dispatch.eventType}|${dispatch.entityType}|${dispatch.entityId}|${dispatch.title}|${dispatch.body ?? ""}`;
    dispatchMap.set(key, dispatch);
  }
  const uniqueDispatches = [...dispatchMap.values()];

  if (uniqueDispatches.length === 0) return 0;

  await helpers.withPgClient(async (pgClient) => {
    await pgClient.query(
      `INSERT INTO comm_inbox_item
         (org_id, principal_id, event_type, entity_type, entity_id, title, body)
       SELECT *
       FROM unnest(
         $1::uuid[],
         $2::uuid[],
         $3::text[],
         $4::comm_inbox_entity_type[],
         $5::text[],
         $6::text[],
         $7::text[]
       )`,
      [
        uniqueDispatches.map((d) => d.orgId),
        uniqueDispatches.map((d) => d.principalId),
        uniqueDispatches.map((d) => d.eventType),
        uniqueDispatches.map((d) => d.entityType),
        uniqueDispatches.map((d) => d.entityId),
        uniqueDispatches.map((d) => d.title),
        uniqueDispatches.map((d) => d.body ?? ""),
      ],
    );
  });

  return uniqueDispatches.length;
}

export async function listSubscriberPrincipalIds(
  helpers: Helpers,
  orgId: string,
  entityType: InboxEntityType,
  entityId: string,
): Promise<string[]> {
  return helpers.withPgClient(async (pgClient) => {
    const { rows } = await pgClient.query<{ principal_id: string }>(
      `SELECT principal_id
         FROM comm_subscription
        WHERE org_id = $1
          AND entity_type = $2
          AND entity_id = $3`,
      [orgId, entityType, entityId],
    );

    return dedupe(rows.map((row) => row.principal_id));
  });
}

export async function listApprovalStepAssignees(
  helpers: Helpers,
  orgId: string,
  approvalRequestId: string,
  stepIndex: number,
): Promise<string[]> {
  return helpers.withPgClient(async (pgClient) => {
    const { rows } = await pgClient.query<{ assignee_id: string; delegated_to_id: string | null }>(
      `SELECT assignee_id, delegated_to_id
         FROM comm_approval_step
        WHERE org_id = $1
          AND approval_request_id = $2
          AND step_index = $3
          AND status = 'pending'`,
      [orgId, approvalRequestId, stepIndex],
    );

    return dedupe(rows.map((row) => row.delegated_to_id ?? row.assignee_id));
  });
}

export async function getApprovalRequester(
  helpers: Helpers,
  orgId: string,
  approvalRequestId: string,
): Promise<string | null> {
  return helpers.withPgClient(async (pgClient) => {
    const { rows } = await pgClient.query<{ requested_by_principal_id: string }>(
      `SELECT requested_by_principal_id
         FROM comm_approval_request
        WHERE org_id = $1
          AND id = $2`,
      [orgId, approvalRequestId],
    );

    return rows[0]?.requested_by_principal_id ?? null;
  });
}
