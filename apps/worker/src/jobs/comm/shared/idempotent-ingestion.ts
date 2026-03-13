import type { Helpers } from "graphile-worker";
import {
  applyIfNotSeen,
  createPostgresProcessedEntriesStoreFromClient,
  type PgQueryClient,
} from "@afenda/core";

export type IdempotentIngestionOptions = {
  ttlSeconds?: number;
  pollIntervalMs?: number;
};

/**
 * Wrap a worker handler in idempotent event-entry processing.
 *
 * entryId guidance:
 * - Use a stable key derived from outbox/event identity.
 * - Include domain namespace for observability.
 *   Example: comm.workflow.triggered:{runId}
 */
export async function applyEventIfNotSeen<T>(
  helpers: Helpers,
  entryId: string,
  handler: (pgClient: PgQueryClient) => Promise<T>,
  opts?: IdempotentIngestionOptions,
): Promise<T> {
  return helpers.withPgClient(async (pgClient) => {
    const store = createPostgresProcessedEntriesStoreFromClient(pgClient);

    return applyIfNotSeen(
      store,
      entryId,
      async () => {
        return handler(pgClient);
      },
      opts,
    );
  });
}

/**
 * Usage example for comm workflow event ingestion.
 *
 * This function demonstrates wiring only and is not registered in taskList.
 */
export async function exampleWorkflowTriggeredIngestion(
  helpers: Helpers,
  payload: { runId: string; workflowId: string; eventType: string },
): Promise<{ runId: string; workflowId: string; applied: boolean }> {
  const entryId = `comm.workflow.triggered:${payload.runId}`;

  return applyEventIfNotSeen(
    helpers,
    entryId,
    async () => {
      helpers.logger.info(
        `example workflow ingestion applied: runId=${payload.runId} workflowId=${payload.workflowId}`,
      );
      return { runId: payload.runId, workflowId: payload.workflowId, applied: true };
    },
    { ttlSeconds: 60 * 60 * 24 * 30, pollIntervalMs: 200 },
  );
}

/**
 * Usage example for document event ingestion.
 *
 * This function demonstrates dedupe key construction and can be copied into
 * concrete document handlers.
 */
export async function exampleDocumentPublishedIngestion(
  helpers: Helpers,
  payload: { documentId: string; eventType: string },
): Promise<{ documentId: string; applied: boolean }> {
  const entryId = `comm.document.published:${payload.documentId}`;

  return applyEventIfNotSeen(
    helpers,
    entryId,
    async () => {
      helpers.logger.info(`example document ingestion applied: documentId=${payload.documentId}`);
      return { documentId: payload.documentId, applied: true };
    },
    { ttlSeconds: 60 * 60 * 24 * 14, pollIntervalMs: 200 },
  );
}
