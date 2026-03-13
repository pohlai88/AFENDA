/**
 * src/shared/events.ts
 *
 * Shared event envelope and common event primitives.
 *
 * Goals:
 *  - Provide a small, consistent event envelope used across domains.
 *  - Keep event payloads minimal (references only); consumers fetch full entities when needed.
 *  - Provide helpers and types to create and validate events.
 *
 * Conventions:
 *  - Events are immutable facts: include eventId, occurredAt (UTC), source,
 *    correlationId, actorId, orgId.
 *  - Payloads are domain-specific and should be small (ids, deltas, metadata).
 *  - Use `schemaVersion` on event payloads when evolving payload shapes.
 */

import { z } from "zod";
import {
  UuidSchema,
  CorrelationIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  generateUuid,
} from "./ids.js";
import { UtcDateTimeSchema, nowUtc } from "./datetime.js";

/* -------------------------------------------------------------------------- */
/* Envelope and metadata                                                      */
/* -------------------------------------------------------------------------- */

/**
 * EventId schema (branded UUID).
 * Keeps event ids distinct from entity ids at the type level.
 */
export const EventIdSchema = UuidSchema.brand<"EventId">();
export type EventId = z.infer<typeof EventIdSchema>;

/**
 * Event envelope metadata that wraps every domain event.
 */
export const EventEnvelopeSchema = z.object({
  eventId: EventIdSchema,
  occurredAt: UtcDateTimeSchema,
  source: z.string().min(1),
  correlationId: CorrelationIdSchema.optional(),
  actorId: PrincipalIdSchema.optional(),
  orgId: OrgIdSchema.optional(),
  schemaVersion: z.number().int().min(1).default(1),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

/* -------------------------------------------------------------------------- */
/* Domain event base                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Generic domain event wrapper: { envelope, type, payload }.
 */
export const DomainEventSchema = z.object({
  envelope: EventEnvelopeSchema,
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

/* -------------------------------------------------------------------------- */
/* Common event payload shapes                                                */
/* -------------------------------------------------------------------------- */

/**
 * Minimal payload for created/updated/deleted events that reference one entity.
 */
export const EntityRefPayloadSchema = z.object({
  id: UuidSchema,
  title: z.string().max(200).optional(),
  reason: z.string().max(1000).optional(),
  schemaVersion: z.number().int().min(1).default(1),
});
export type EntityRefPayload = z.infer<typeof EntityRefPayloadSchema>;

/* -------------------------------------------------------------------------- */
/* Example canonical events used across multiple domains                      */
/* -------------------------------------------------------------------------- */

/** Emitted when a task is created. */
export const TaskCreatedEventSchema = z.object({
  envelope: EventEnvelopeSchema,
  type: z.literal("task.created"),
  payload: z.object({
    taskId: UuidSchema,
    title: z.string().max(200).optional(),
    createdBy: PrincipalIdSchema.optional(),
    schemaVersion: z.number().int().min(1).default(1),
  }),
});
export type TaskCreatedEvent = z.infer<typeof TaskCreatedEventSchema>;

/** Emitted when a workflow execution status changes. */
export const WorkflowExecutedEventSchema = z.object({
  envelope: EventEnvelopeSchema,
  type: z.literal("workflow.executed"),
  payload: z.object({
    workflowId: UuidSchema,
    runId: UuidSchema,
    status: z.enum(["pending", "running", "completed", "failed"]),
    triggerEventId: z.string().uuid().nullable().optional(),
    schemaVersion: z.number().int().min(1).default(1),
  }),
});
export type WorkflowExecutedEvent = z.infer<typeof WorkflowExecutedEventSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Create a canonical envelope for an event.
 */
export function createEnvelope(opts: {
  eventId?: string;
  occurredAt?: string;
  source: string;
  correlationId?: string;
  actorId?: string;
  orgId?: string;
  schemaVersion?: number;
}): EventEnvelope {
  const eventId = opts.eventId ?? generateUuid();
  const occurredAt = opts.occurredAt ?? nowUtc();

  const envelope = {
    eventId: EventIdSchema.parse(eventId),
    occurredAt: UtcDateTimeSchema.parse(occurredAt),
    source: z.string().min(1).parse(opts.source),
    correlationId: opts.correlationId ? CorrelationIdSchema.parse(opts.correlationId) : undefined,
    actorId: opts.actorId ? PrincipalIdSchema.parse(opts.actorId) : undefined,
    orgId: opts.orgId ? OrgIdSchema.parse(opts.orgId) : undefined,
    schemaVersion: opts.schemaVersion ?? 1,
  };

  return EventEnvelopeSchema.parse(envelope);
}

/**
 * Wrap a domain payload into a DomainEvent with a validated envelope.
 */
export function buildDomainEvent(params: {
  type: string;
  payload: Record<string, unknown>;
  source: string;
  correlationId?: string;
  actorId?: string;
  orgId?: string;
  eventId?: string;
  occurredAt?: string;
  schemaVersion?: number;
}): DomainEvent {
  const envelope = createEnvelope({
    eventId: params.eventId,
    occurredAt: params.occurredAt,
    source: params.source,
    correlationId: params.correlationId,
    actorId: params.actorId,
    orgId: params.orgId,
    schemaVersion: params.schemaVersion,
  });

  const event = {
    envelope,
    type: z.string().min(1).parse(params.type),
    payload: z.record(z.string(), z.unknown()).parse(params.payload),
  };

  return DomainEventSchema.parse(event);
}

/* -------------------------------------------------------------------------- */
/* Export bundle                                                              */
/* -------------------------------------------------------------------------- */

export const SharedEvents = {
  EventIdSchema,
  EventEnvelopeSchema,
  DomainEventSchema,
  EntityRefPayloadSchema,
  TaskCreatedEventSchema,
  WorkflowExecutedEventSchema,
  createEnvelope,
  buildDomainEvent,
};

export default SharedEvents;
