import { z } from "zod";
import { CorrelationIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  BoardResolutionIdSchema,
  type ResolutionStatus,
  ResolutionStatusSchema,
  VoteSchema,
} from "./resolution.entity.js";
import { ResolutionReasonSchema, ResolutionTitleSchema } from "./resolution.shared.js";

const ResolutionEventBaseSchema = z.object({
  resolutionId: BoardResolutionIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

export const ResolutionProposedPayloadSchema = ResolutionEventBaseSchema.extend({
  meetingId: BoardMeetingIdSchema,
  title: ResolutionTitleSchema,
});

export const ResolutionUpdatedPayloadSchema = ResolutionEventBaseSchema.extend({
  status: ResolutionStatusSchema,
});

export const ResolutionWithdrawnPayloadSchema = ResolutionEventBaseSchema.extend({
  status: ResolutionStatusSchema,
  reason: ResolutionReasonSchema,
});

export const ResolutionVoteCastPayloadSchema = ResolutionEventBaseSchema.extend({
  principalId: PrincipalIdSchema,
  vote: VoteSchema,
});

export const ResolutionStatusChangePayloadSchema = withResolutionStatusTransitionRefinement(
  ResolutionEventBaseSchema.extend({
    fromStatus: ResolutionStatusSchema,
    status: ResolutionStatusSchema,
  }),
);

const RESOLUTION_STATUS_TRANSITIONS = {
  proposed: ["discussed", "approved", "rejected", "deferred", "tabled"],
  discussed: ["approved", "rejected", "deferred", "tabled"],
  approved: [],
  rejected: [],
  deferred: ["proposed", "discussed"],
  tabled: ["proposed", "discussed"],
} as const satisfies Record<ResolutionStatus, readonly ResolutionStatus[]>;

export function getAllowedResolutionStatusTransitions(
  fromStatus: ResolutionStatus,
): readonly ResolutionStatus[] {
  return RESOLUTION_STATUS_TRANSITIONS[fromStatus];
}

type ResolutionStatusTransitionData = {
  fromStatus?: ResolutionStatus;
  status?: ResolutionStatus;
};

/**
 * Adds a status transition rule for payloads containing { fromStatus, status }.
 * No issue is added when either field is missing, so callers can compose this
 * onto strict schemas without changing required/optional field semantics.
 */
export function withResolutionStatusTransitionRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((value, ctx) => {
    const data = value as ResolutionStatusTransitionData;
    if (!data.fromStatus || !data.status) {
      return;
    }

    const allowedTransitions = getAllowedResolutionStatusTransitions(data.fromStatus);
    if (allowedTransitions.includes(data.status)) {
      return;
    }

    const allowedLabel =
      allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "no further transitions";
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid resolution status transition from '${data.fromStatus}' to '${data.status}'. Allowed: ${allowedLabel}.`,
      path: ["status"],
    });
  }) as T;
}

export const ResolutionEventSchemas = {
  Proposed: ResolutionProposedPayloadSchema,
  Updated: ResolutionUpdatedPayloadSchema,
  Withdrawn: ResolutionWithdrawnPayloadSchema,
  VoteCast: ResolutionVoteCastPayloadSchema,
};

export const ResolutionTransitionSchemas = {
  StatusChange: ResolutionStatusChangePayloadSchema,
};

type Infer<T extends z.ZodTypeAny> = z.infer<T>;

export type ResolutionProposedPayload = Infer<typeof ResolutionProposedPayloadSchema>;
export type ResolutionUpdatedPayload = Infer<typeof ResolutionUpdatedPayloadSchema>;
export type ResolutionWithdrawnPayload = Infer<typeof ResolutionWithdrawnPayloadSchema>;
export type ResolutionVoteCastPayload = Infer<typeof ResolutionVoteCastPayloadSchema>;
export type ResolutionStatusChangePayload = Infer<typeof ResolutionStatusChangePayloadSchema>;

export type ResolutionEventPayloads = {
  Proposed: ResolutionProposedPayload;
  Updated: ResolutionUpdatedPayload;
  Withdrawn: ResolutionWithdrawnPayload;
  VoteCast: ResolutionVoteCastPayload;
};

export type ResolutionTransitionPayloads = {
  StatusChange: ResolutionStatusChangePayload;
};

export type ResolutionProposedEvent = ResolutionProposedPayload;
export type ResolutionUpdatedEvent = ResolutionUpdatedPayload;
export type ResolutionWithdrawnEvent = ResolutionWithdrawnPayload;
export type ResolutionVoteCastEvent = ResolutionVoteCastPayload;

export type ResolutionEvents = {
  Proposed: ResolutionProposedEvent;
  Updated: ResolutionUpdatedEvent;
  Withdrawn: ResolutionWithdrawnEvent;
  VoteCast: ResolutionVoteCastEvent;
};
