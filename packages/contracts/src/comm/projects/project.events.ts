export {
  COMM_PROJECT_ARCHIVED,
  COMM_PROJECT_CREATED,
  COMM_PROJECT_DELETED,
  COMM_PROJECT_MEMBER_ADDED,
  COMM_PROJECT_MEMBER_REMOVED,
  COMM_PROJECT_MILESTONE_COMPLETED,
  COMM_PROJECT_MILESTONE_CREATED,
  COMM_PROJECT_STATUS_CHANGED,
  COMM_PROJECT_UPDATED,
} from "./project.event-types.js";

import {
  COMM_PROJECT_ARCHIVED,
  COMM_PROJECT_CREATED,
  COMM_PROJECT_DELETED,
  COMM_PROJECT_MEMBER_ADDED,
  COMM_PROJECT_MEMBER_REMOVED,
  COMM_PROJECT_MILESTONE_COMPLETED,
  COMM_PROJECT_MILESTONE_CREATED,
  COMM_PROJECT_STATUS_CHANGED,
  COMM_PROJECT_UPDATED,
} from "./project.event-types.js";

export const CommProjectEvents = {
  Created: COMM_PROJECT_CREATED,
  Updated: COMM_PROJECT_UPDATED,
  StatusChanged: COMM_PROJECT_STATUS_CHANGED,
  Archived: COMM_PROJECT_ARCHIVED,
  Deleted: COMM_PROJECT_DELETED,
  MemberAdded: COMM_PROJECT_MEMBER_ADDED,
  MemberRemoved: COMM_PROJECT_MEMBER_REMOVED,
  MilestoneCreated: COMM_PROJECT_MILESTONE_CREATED,
  MilestoneCompleted: COMM_PROJECT_MILESTONE_COMPLETED,
} as const;

/**
 * Aggregate of project-domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const CommProjectEventTypes = [
  CommProjectEvents.Created,
  CommProjectEvents.Updated,
  CommProjectEvents.StatusChanged,
  CommProjectEvents.Archived,
  CommProjectEvents.Deleted,
  CommProjectEvents.MemberAdded,
  CommProjectEvents.MemberRemoved,
  CommProjectEvents.MilestoneCreated,
  CommProjectEvents.MilestoneCompleted,
] as const;

export const ProjectEventTypes = CommProjectEventTypes;

export type CommProjectEvent = (typeof CommProjectEvents)[keyof typeof CommProjectEvents];

export {
  ProjectArchivedEventSchema,
  ProjectCreatedEventSchema,
  ProjectDeletedEventSchema,
  ProjectEventPayloadSchemas,
  ProjectMemberAddedEventSchema,
  ProjectMemberRemovedEventSchema,
  ProjectMilestoneCompletedEventSchema,
  ProjectMilestoneCreatedEventSchema,
  ProjectStatusChangedEventSchema,
  ProjectUpdatedEventSchema,
} from "./project.events.payloads.js";

export type {
  ProjectArchivedEvent,
  ProjectCreatedEvent,
  ProjectDeletedEvent,
  ProjectMemberAddedEvent,
  ProjectMemberRemovedEvent,
  ProjectMilestoneCompletedEvent,
  ProjectMilestoneCreatedEvent,
  ProjectStatusChangedEvent,
  ProjectUpdatedEvent,
} from "./project.events.payloads.js";
