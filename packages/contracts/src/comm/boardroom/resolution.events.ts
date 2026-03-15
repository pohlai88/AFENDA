export const CommResolutionEvents = {
  Proposed: "COMM.RESOLUTION_PROPOSED",
  Updated: "COMM.RESOLUTION_UPDATED",
  Withdrawn: "COMM.RESOLUTION_WITHDRAWN",
  VoteCast: "COMM.VOTE_CAST",
} as const;

export const COMM_RESOLUTION_PROPOSED = CommResolutionEvents.Proposed;
export const COMM_RESOLUTION_UPDATED = CommResolutionEvents.Updated;
export const COMM_RESOLUTION_WITHDRAWN = CommResolutionEvents.Withdrawn;
export const COMM_VOTE_CAST = CommResolutionEvents.VoteCast;

export type CommResolutionEvent = (typeof CommResolutionEvents)[keyof typeof CommResolutionEvents];

export const CommResolutionEventTypes = Object.values(
  CommResolutionEvents,
) as readonly CommResolutionEvent[];

export {
  ResolutionEventSchemas,
  ResolutionProposedPayloadSchema,
  ResolutionStatusChangePayloadSchema,
  ResolutionTransitionSchemas,
  ResolutionUpdatedPayloadSchema,
  ResolutionVoteCastPayloadSchema,
  ResolutionWithdrawnPayloadSchema,
} from "./resolution.events.payloads.js";

export type {
  ResolutionEventPayloads,
  ResolutionEvents,
  ResolutionProposedPayload,
  ResolutionStatusChangePayload,
  ResolutionTransitionPayloads,
  ResolutionUpdatedPayload,
  ResolutionVoteCastPayload,
  ResolutionWithdrawnPayload,
  ResolutionProposedEvent,
  ResolutionUpdatedEvent,
  ResolutionVoteCastEvent,
  ResolutionWithdrawnEvent,
} from "./resolution.events.payloads.js";

export const BoardResolutionEventTypes = CommResolutionEventTypes;

export const ResolutionEventTypes = BoardResolutionEventTypes;
