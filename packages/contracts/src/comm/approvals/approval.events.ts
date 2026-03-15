export const COMM_APPROVAL_REQUEST_CREATED = "COMM.APPROVAL_REQUEST_CREATED" as const;
export const COMM_APPROVAL_STEP_APPROVED = "COMM.APPROVAL_STEP_APPROVED" as const;
export const COMM_APPROVAL_STEP_REJECTED = "COMM.APPROVAL_STEP_REJECTED" as const;
export const COMM_APPROVAL_STEP_DELEGATED = "COMM.APPROVAL_STEP_DELEGATED" as const;
export const COMM_APPROVAL_ESCALATED = "COMM.APPROVAL_ESCALATED" as const;
export const COMM_APPROVAL_WITHDRAWN = "COMM.APPROVAL_WITHDRAWN" as const;
export const COMM_APPROVAL_POLICY_CREATED = "COMM.APPROVAL_POLICY_CREATED" as const;
export const COMM_APPROVAL_DELEGATION_SET = "COMM.APPROVAL_DELEGATION_SET" as const;
export const COMM_APPROVAL_STATUS_CHANGED = "COMM.APPROVAL_STATUS_CHANGED" as const;
export const COMM_APPROVAL_EXPIRED = "COMM.APPROVAL_EXPIRED" as const;

export const CommApprovalEvents = {
  RequestCreated: COMM_APPROVAL_REQUEST_CREATED,
  StepApproved: COMM_APPROVAL_STEP_APPROVED,
  StepRejected: COMM_APPROVAL_STEP_REJECTED,
  StepDelegated: COMM_APPROVAL_STEP_DELEGATED,
  Escalated: COMM_APPROVAL_ESCALATED,
  Withdrawn: COMM_APPROVAL_WITHDRAWN,
  PolicyCreated: COMM_APPROVAL_POLICY_CREATED,
  DelegationSet: COMM_APPROVAL_DELEGATION_SET,
  StatusChanged: COMM_APPROVAL_STATUS_CHANGED,
  Expired: COMM_APPROVAL_EXPIRED,
} as const;

export type CommApprovalEvent = (typeof CommApprovalEvents)[keyof typeof CommApprovalEvents];

export const CommApprovalEventTypes = [
  CommApprovalEvents.RequestCreated,
  CommApprovalEvents.StepApproved,
  CommApprovalEvents.StepRejected,
  CommApprovalEvents.StepDelegated,
  CommApprovalEvents.Escalated,
  CommApprovalEvents.Withdrawn,
  CommApprovalEvents.PolicyCreated,
  CommApprovalEvents.DelegationSet,
  CommApprovalEvents.StatusChanged,
  CommApprovalEvents.Expired,
] as const;

export {
  ApprovalDelegationSetEventSchema,
  ApprovalEscalatedEventSchema,
  ApprovalExpiredEventSchema,
  ApprovalPolicyCreatedEventSchema,
  ApprovalRequestCreatedEventSchema,
  ApprovalStatusChangedEventSchema,
  ApprovalStepApprovedEventSchema,
  ApprovalStepDelegatedEventSchema,
  ApprovalStepRejectedEventSchema,
  ApprovalWithdrawnEventSchema,
  CommApprovalDelegationSetPayloadSchema,
  CommApprovalEscalatedPayloadSchema,
  CommApprovalExpiredPayloadSchema,
  CommApprovalPolicyCreatedPayloadSchema,
  ApprovalEventPayloadSchemas,
  CommApprovalRequestCreatedPayloadSchema,
  CommApprovalStatusChangedPayloadSchema,
  CommApprovalStepApprovedPayloadSchema,
  CommApprovalStepDelegatedPayloadSchema,
  CommApprovalStepRejectedPayloadSchema,
  CommApprovalWithdrawnPayloadSchema,
} from "./approval.events.payloads.js";

export type {
  ApprovalDelegationSetEvent,
  ApprovalEscalatedEvent,
  ApprovalExpiredEvent,
  ApprovalPolicyCreatedEvent,
  ApprovalRequestCreatedEvent,
  ApprovalStatusChangedEvent,
  ApprovalStepApprovedEvent,
  ApprovalStepDelegatedEvent,
  ApprovalStepRejectedEvent,
  ApprovalWithdrawnEvent,
  CommApprovalDelegationSetPayload,
  CommApprovalEscalatedPayload,
  CommApprovalExpiredPayload,
  CommApprovalPolicyCreatedPayload,
  CommApprovalRequestCreatedPayload,
  CommApprovalStatusChangedPayload,
  CommApprovalStepApprovedPayload,
  CommApprovalStepDelegatedPayload,
  CommApprovalStepRejectedPayload,
  CommApprovalWithdrawnPayload,
} from "./approval.events.payloads.js";

/**
 * Aggregate of approval-domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const ApprovalEventTypes = CommApprovalEventTypes;
