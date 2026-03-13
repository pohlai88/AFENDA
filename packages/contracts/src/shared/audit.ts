import { z } from "zod";

import { nowUtc as clockNowUtc } from "./clock.js";
import { UtcDateTimeSchema } from "./datetime.js";
import { AuditLogIdSchema, generateUuid } from "./ids.js";
import { IdempotencyKeySchema as KernelIdempotencyKeySchema } from "../kernel/execution/idempotency/request-key.js";

export const AuditActorTypeValues = ["user", "service", "system"] as const;
export const AuditActorTypeSchema = z.enum(AuditActorTypeValues);
export type AuditActorType = z.infer<typeof AuditActorTypeSchema>;

export const AuditChannelValues = ["api", "ui", "worker", "batch", "webhook"] as const;
export const AuditChannelSchema = z.enum(AuditChannelValues);
export type AuditChannel = z.infer<typeof AuditChannelSchema>;

const JsonRecordSchema = z.record(z.string(), z.unknown());

export const AuditFieldsSchema = z.object({
  occurredAt: UtcDateTimeSchema,
  actorId: z.string().min(1).optional(),
  actorType: AuditActorTypeSchema.default("user"),
  action: z.string().min(1),
  resourceType: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
  targetPrincipalId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  idempotencyKey: KernelIdempotencyKeySchema.optional(),
  traceId: z.string().min(1).optional(),
  reasonCode: z.string().min(1).optional(),
  reasonText: z.string().min(1).optional(),
  justification: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  service: z.string().min(1).optional(),
  method: z.string().min(1).optional(),
  channel: AuditChannelSchema.optional(),
  clientIp: z.string().min(1).optional(),
  userAgent: z.string().min(1).optional(),
  before: JsonRecordSchema.optional(),
  after: JsonRecordSchema.optional(),
  tags: z.array(z.string().min(1)).optional(),
  metadata: JsonRecordSchema.optional(),
});

export type AuditFields = z.infer<typeof AuditFieldsSchema>;

export const AuditFieldsInputSchema = AuditFieldsSchema.extend({
  occurredAt: UtcDateTimeSchema.optional(),
});
export type AuditFieldsInput = z.input<typeof AuditFieldsInputSchema>;

export const AuditLogEntrySchema = AuditFieldsSchema.extend({
  id: AuditLogIdSchema,
  createdAt: UtcDateTimeSchema,
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export type AuditRedactionRule = {
  keys: string[];
  replacement?: unknown;
};

export function redactAuditSnapshots(
  input: { before?: Record<string, unknown>; after?: Record<string, unknown> },
  rule: AuditRedactionRule,
): { before?: Record<string, unknown>; after?: Record<string, unknown> } {
  const replacement = rule.replacement ?? "[REDACTED]";

  const redactRecord = (value: Record<string, unknown> | undefined) => {
    if (!value) return value;
    const clone: Record<string, unknown> = { ...value };
    for (const key of rule.keys) {
      if (Object.prototype.hasOwnProperty.call(clone, key)) {
        clone[key] = replacement;
      }
    }
    return clone;
  };

  return {
    before: redactRecord(input.before),
    after: redactRecord(input.after),
  };
}

export function createAuditLogEntry(
  input: AuditFieldsInput,
  opts?: { id?: string; createdAt?: string; now?: () => string },
): AuditLogEntry {
  const now = opts?.now ?? clockNowUtc;
  const occurredAt = input.occurredAt ?? now();

  const normalized = {
    ...input,
    occurredAt,
  };

  const parsedFields = AuditFieldsSchema.parse(normalized);
  return AuditLogEntrySchema.parse({
    id: opts?.id ?? generateUuid(),
    createdAt: opts?.createdAt ?? now(),
    ...parsedFields,
  });
}

export async function appendAudit<T>(
  writer: (entry: AuditLogEntry) => Promise<T> | T,
  input: AuditFieldsInput,
  opts?: { id?: string; createdAt?: string; now?: () => string },
): Promise<T> {
  const entry = createAuditLogEntry(input, opts);
  return writer(entry);
}

export const SharedAudit = {
  AuditActorTypeValues,
  AuditActorTypeSchema,
  AuditChannelValues,
  AuditChannelSchema,
  AuditFieldsSchema,
  AuditFieldsInputSchema,
  AuditLogEntrySchema,
  redactAuditSnapshots,
  createAuditLogEntry,
  appendAudit,
};

export default SharedAudit;
