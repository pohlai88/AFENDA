import { z } from "zod";
import {
  CommTaskIdSchema,
  CorrelationIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  TaskWatcherIdSchema,
} from "../../shared/ids.js";

const TaskWatcherEventContextPayloadSchema = z.object({
  taskId: CommTaskIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

// ─── Watcher Event Payloads ──────────────────────────────────────────────────

export const WatcherAddedEventSchema = z.object({
  ...TaskWatcherEventContextPayloadSchema.shape,
  watcherId: TaskWatcherIdSchema,
  principalId: PrincipalIdSchema,
  addedByPrincipalId: PrincipalIdSchema,
});

export const WatcherRemovedEventSchema = z.object({
  ...TaskWatcherEventContextPayloadSchema.shape,
  principalId: PrincipalIdSchema,
  removedByPrincipalId: PrincipalIdSchema,
});

export const TaskWatcherEventPayloadSchemas = {
  Added: WatcherAddedEventSchema,
  Removed: WatcherRemovedEventSchema,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type WatcherAddedEvent = z.infer<typeof WatcherAddedEventSchema>;
export type WatcherRemovedEvent = z.infer<typeof WatcherRemovedEventSchema>;
