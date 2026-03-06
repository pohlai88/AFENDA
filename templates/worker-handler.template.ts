/**
 * TEMPLATE: Worker event handler for apps/worker.
 *
 * Copy this file to: apps/worker/src/jobs/handle-<event-name>.ts
 * Then: find-replace Event/event with your domain event.
 *
 * RULES:
 *   1. Handlers MUST be idempotent (safe to re-execute).
 *   2. Use helpers.withPgClient() for DB access (not direct imports).
 *   3. Log structured output via Pino (not console.*).
 *   4. Register in task list: apps/worker/src/index.ts.
 *   5. Add event type routing in process-outbox-event.ts.
 */

// import type { Task } from "graphile-worker";

// export const handleEntityEvent: Task = async (payload, helpers) => {
//   const { type, orgId, correlationId, payload: eventPayload } = payload as {
//     type: string;
//     orgId: string;
//     correlationId: string;
//     payload: Record<string, unknown>;
//   };
//
//   helpers.logger.info(
//     { type, orgId, correlationId },
//     "Processing entity event",
//   );
//
//   // Implement business logic here:
//   // - Send notifications
//   // - Update projections
//   // - Trigger downstream workflows
//   // - Queue additional jobs
//
//   // Example: DB access
//   // await helpers.withPgClient(async (pgClient) => {
//   //   await pgClient.query("SELECT 1");
//   // });
// };
