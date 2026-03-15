import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommProjectEvents, CommProjectEventTypes } from "./project.events.js";
import {
  ProjectArchivedEventSchema,
  ProjectCreatedEventSchema,
  ProjectDeletedEventSchema,
  ProjectMemberAddedEventSchema,
  ProjectMemberRemovedEventSchema,
  ProjectMilestoneCompletedEventSchema,
  ProjectMilestoneCreatedEventSchema,
  ProjectStatusChangedEventSchema,
  ProjectUpdatedEventSchema,
} from "./project.events.payloads.js";

const ProjectOutboxEventNameSchema = z.enum(CommProjectEventTypes);

export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export const ProjectOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: ProjectOutboxEventNameSchema,
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
    case CommProjectEvents.Created:
      validatePayload(ProjectCreatedEventSchema);
      break;
    case CommProjectEvents.Updated:
      validatePayload(ProjectUpdatedEventSchema);
      break;
    case CommProjectEvents.StatusChanged:
      validatePayload(ProjectStatusChangedEventSchema);
      break;
    case CommProjectEvents.Archived:
      validatePayload(ProjectArchivedEventSchema);
      break;
    case CommProjectEvents.Deleted:
      validatePayload(ProjectDeletedEventSchema);
      break;
    case CommProjectEvents.MemberAdded:
      validatePayload(ProjectMemberAddedEventSchema);
      break;
    case CommProjectEvents.MemberRemoved:
      validatePayload(ProjectMemberRemovedEventSchema);
      break;
    case CommProjectEvents.MilestoneCreated:
      validatePayload(ProjectMilestoneCreatedEventSchema);
      break;
    case CommProjectEvents.MilestoneCompleted:
      validatePayload(ProjectMilestoneCompletedEventSchema);
      break;
    default:
      break;
  }
});

export type ProjectOutboxRecord = z.infer<typeof ProjectOutboxRecordSchema>;
