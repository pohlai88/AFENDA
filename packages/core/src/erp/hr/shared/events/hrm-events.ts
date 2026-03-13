export const HRM_EVENTS = {
  PERSON_CREATED: "hrm.person.created",
  EMPLOYEE_HIRED: "hrm.employee.hired",
  EMPLOYEE_TRANSFERRED: "hrm.employee.transferred",
  EMPLOYEE_TERMINATED: "hrm.employee.terminated",
  EMPLOYEE_REHIRED: "hrm.employee.rehired",
  ORG_UNIT_CREATED: "hrm.org-unit.created",
  JOB_CREATED: "hrm.job.created",
  GRADE_CREATED: "hrm.grade.created",
  POSITION_CREATED: "hrm.position.created",
  POSITION_CLOSED: "hrm.position.closed",
  REQUISITION_CREATED: "hrm.requisition.created",
  REQUISITION_APPROVED: "hrm.requisition.approved",
  CANDIDATE_CREATED: "hrm.candidate.created",
  APPLICATION_SUBMITTED: "hrm.application.submitted",
  INTERVIEW_SCHEDULED: "hrm.interview.scheduled",
  INTERVIEW_FEEDBACK_SUBMITTED: "hrm.interview-feedback.submitted",
  OFFER_ISSUED: "hrm.offer.issued",
  OFFER_ACCEPTED: "hrm.offer.accepted",
  ONBOARDING_STARTED: "hrm.onboarding.started",
  ONBOARDING_TASK_COMPLETED: "hrm.onboarding-task.completed",
  PROBATION_REVIEW_RECORDED: "hrm.probation.review.recorded",
  SEPARATION_STARTED: "hrm.separation.started",
  EXIT_ITEM_CLEARED: "hrm.exit-item.cleared",
  SEPARATION_FINALIZED: "hrm.separation.finalized",
  ATTENDANCE_RECORDED: "hrm.attendance.recorded",
  ROSTER_ASSIGNMENT_CREATED: "hrm.roster-assignment.created",
  LEAVE_REQUEST_CREATED: "hrm.leave.request.created",
  LEAVE_REQUEST_REVIEWED: "hrm.leave.request.reviewed",
  LEAVE_BALANCE_RECALCULATED: "hrm.leave.balance.recalculated",
  COMPENSATION_STRUCTURE_CREATED: "hrm.compensation.structure.created",
  COMPENSATION_PACKAGE_ASSIGNED: "hrm.compensation.package.assigned",
  SALARY_CHANGE_PROCESSED: "hrm.compensation.salary.changed",
  BENEFIT_PLAN_CREATED: "hrm.benefit.plan.created",
  BENEFIT_ENROLLED: "hrm.benefit.enrolled",
} as const;

export type HrmEventName = (typeof HRM_EVENTS)[keyof typeof HRM_EVENTS];

export interface HrmDomainEvent<TPayload = Record<string, unknown>> {
  eventName: HrmEventName;
  orgId: string;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
  occurredAt: string;
  actorUserId: string;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}
