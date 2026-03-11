import { date, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { approvalColumns, index, metadataColumns, orgColumns } from "./_shared";
import { hrmPositions } from "./hrm-organization";

export const hrmJobRequisitions = pgTable(
  "hrm_job_requisitions",
  {
    ...orgColumns,
    requisitionNumber: varchar("requisition_number", { length: 50 }).notNull(),
    requisitionTitle: varchar("requisition_title", { length: 255 }).notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    orgUnitId: uuid("org_unit_id"),
    positionId: uuid("position_id").references(() => hrmPositions.id),
    hiringManagerEmployeeId: uuid("hiring_manager_employee_id"),
    requestedHeadcount: varchar("requested_headcount", { length: 20 }).default("1").notNull(),
    requestedStartDate: date("requested_start_date"),
    ...approvalColumns,
    ...metadataColumns,
  },
  (t) => ({
    requisitionNumberUq: uniqueIndex("hrm_job_requisitions_org_number_uq").on(
      t.orgId,
      t.requisitionNumber,
    ),
    statusIdx: index("hrm_job_requisitions_status_idx").on(t.orgId, t.status),
  }),
);

export const hrmCandidates = pgTable(
  "hrm_candidates",
  {
    ...orgColumns,
    candidateCode: varchar("candidate_code", { length: 50 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }),
    mobilePhone: varchar("mobile_phone", { length: 50 }),
    sourceChannel: varchar("source_channel", { length: 50 }),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    candidateCodeUq: uniqueIndex("hrm_candidates_org_candidate_code_uq").on(t.orgId, t.candidateCode),
    emailIdx: index("hrm_candidates_email_idx").on(t.orgId, t.email),
  }),
);

export const hrmCandidateApplications = pgTable(
  "hrm_candidate_applications",
  {
    ...orgColumns,
    candidateId: uuid("candidate_id").notNull().references(() => hrmCandidates.id),
    requisitionId: uuid("requisition_id").notNull().references(() => hrmJobRequisitions.id),
    applicationStage: varchar("application_stage", { length: 50 }).default("applied").notNull(),
    appliedAt: date("applied_at"),
    rejectedAt: date("rejected_at"),
    ...metadataColumns,
  },
  (t) => ({
    uniqIdx: uniqueIndex("hrm_candidate_applications_unique_uq").on(
      t.orgId,
      t.candidateId,
      t.requisitionId,
    ),
    stageIdx: index("hrm_candidate_applications_stage_idx").on(t.orgId, t.applicationStage),
  }),
);

export const hrmInterviews = pgTable(
  "hrm_interviews",
  {
    ...orgColumns,
    applicationId: uuid("application_id").notNull().references(() => hrmCandidateApplications.id),
    interviewType: varchar("interview_type", { length: 50 }).notNull(),
    scheduledAt: date("scheduled_at"),
    interviewerEmployeeId: uuid("interviewer_employee_id"),
    status: varchar("status", { length: 50 }).default("scheduled").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    appIdx: index("hrm_interviews_application_idx").on(t.orgId, t.applicationId),
  }),
);

export const hrmInterviewFeedback = pgTable(
  "hrm_interview_feedback",
  {
    ...orgColumns,
    interviewId: uuid("interview_id").notNull().references(() => hrmInterviews.id),
    reviewerEmployeeId: uuid("reviewer_employee_id"),
    recommendation: varchar("recommendation", { length: 50 }),
    comments: varchar("comments", { length: 2000 }),
    submittedAt: date("submitted_at"),
    ...metadataColumns,
  },
  (t) => ({
    interviewIdx: index("hrm_interview_feedback_interview_idx").on(t.orgId, t.interviewId),
  }),
);

export const hrmOffers = pgTable(
  "hrm_offers",
  {
    ...orgColumns,
    applicationId: uuid("application_id").notNull().references(() => hrmCandidateApplications.id),
    offerNumber: varchar("offer_number", { length: 50 }).notNull(),
    offeredOn: date("offered_on"),
    offerExpiryDate: date("offer_expiry_date"),
    offeredCompensation: varchar("offered_compensation", { length: 50 }),
    offerStatus: varchar("offer_status", { length: 50 }).default("issued").notNull(),
    acceptedAt: date("accepted_at"),
    ...metadataColumns,
  },
  (t) => ({
    offerNumberUq: uniqueIndex("hrm_offers_org_offer_number_uq").on(t.orgId, t.offerNumber),
    appIdx: index("hrm_offers_application_idx").on(t.orgId, t.applicationId),
  }),
);