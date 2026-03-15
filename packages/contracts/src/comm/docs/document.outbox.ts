import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommDocumentEvents, DocumentEventTypes } from "./document.events.js";
import {
  DocumentArchivedEventSchema,
  DocumentCollaboratorAddedEventSchema,
  DocumentCollaboratorRemovedEventSchema,
  DocumentCreatedEventSchema,
  DocumentPublishedEventSchema,
  DocumentUpdatedEventSchema,
} from "./document.events.payloads.js";

const DocumentOutboxEventNameSchema = z.enum(DocumentEventTypes);

export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export const DocumentOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: DocumentOutboxEventNameSchema,
}).superRefine((data, ctx) => {
  const validatePayload = (schema: z.ZodType<unknown>) => {
    const result = schema.safeParse(data.payload);
    if (result.success) return;
    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: ["payload", ...issue.path],
      });
    }
  };

  switch (data.eventName) {
    case CommDocumentEvents.Created:
      validatePayload(DocumentCreatedEventSchema);
      break;
    case CommDocumentEvents.Updated:
      validatePayload(DocumentUpdatedEventSchema);
      break;
    case CommDocumentEvents.Published:
      validatePayload(DocumentPublishedEventSchema);
      break;
    case CommDocumentEvents.Archived:
      validatePayload(DocumentArchivedEventSchema);
      break;
    case CommDocumentEvents.CollaboratorAdded:
      validatePayload(DocumentCollaboratorAddedEventSchema);
      break;
    case CommDocumentEvents.CollaboratorRemoved:
      validatePayload(DocumentCollaboratorRemovedEventSchema);
      break;
    default:
      break;
  }
});

export type DocumentOutboxRecord = z.infer<typeof DocumentOutboxRecordSchema>;
