import type { DbClient } from "@afenda/db";
import {
  hrmEmploymentRecords,
  hrmEmploymentStatusHistory,
  hrmWorkAssignments,
} from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";

export interface EmploymentTimelineItem {
  kind: "employment" | "status" | "assignment";
  occurredAt: string;
  title: string;
  status: string | null;
  reasonCode: string | null;
  employmentId: string;
  workAssignmentId: string | null;
  legalEntityId: string | null;
  departmentId: string | null;
  positionId: string | null;
  jobId: string | null;
  gradeId: string | null;
  managerEmployeeId: string | null;
  effectiveTo: string | null;
}

export interface EmploymentTimelineView {
  employmentId: string;
  employeeId: string;
  employmentNumber: string;
  employmentStatus: string;
  hireDate: string | null;
  startDate: string | null;
  terminationDate: string | null;
  items: EmploymentTimelineItem[];
}

export async function getEmploymentTimeline(
  db: DbClient,
  orgId: string,
  employmentId: string,
): Promise<EmploymentTimelineView | null> {
  const [employment] = await db
    .select({
      employmentId: hrmEmploymentRecords.id,
      employeeId: hrmEmploymentRecords.employeeId,
      employmentNumber: hrmEmploymentRecords.employmentNumber,
      employmentStatus: hrmEmploymentRecords.employmentStatus,
      hireDate: hrmEmploymentRecords.hireDate,
      startDate: hrmEmploymentRecords.startDate,
      terminationDate: hrmEmploymentRecords.terminationDate,
      legalEntityId: hrmEmploymentRecords.legalEntityId,
    })
    .from(hrmEmploymentRecords)
    .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, employmentId)));

  if (!employment) {
    return null;
  }

  const statusHistory = await db
    .select({
      changedAt: hrmEmploymentStatusHistory.changedAt,
      oldStatus: hrmEmploymentStatusHistory.oldStatus,
      newStatus: hrmEmploymentStatusHistory.newStatus,
      reasonCode: hrmEmploymentStatusHistory.reasonCode,
    })
    .from(hrmEmploymentStatusHistory)
    .where(
      and(
        eq(hrmEmploymentStatusHistory.orgId, orgId),
        eq(hrmEmploymentStatusHistory.employmentId, employmentId),
      ),
    )
    .orderBy(asc(hrmEmploymentStatusHistory.changedAt));

  const assignments = await db
    .select({
      workAssignmentId: hrmWorkAssignments.id,
      effectiveFrom: hrmWorkAssignments.effectiveFrom,
      effectiveTo: hrmWorkAssignments.effectiveTo,
      changeReason: hrmWorkAssignments.changeReason,
      legalEntityId: hrmWorkAssignments.legalEntityId,
      departmentId: hrmWorkAssignments.departmentId,
      positionId: hrmWorkAssignments.positionId,
      jobId: hrmWorkAssignments.jobId,
      gradeId: hrmWorkAssignments.gradeId,
      managerEmployeeId: hrmWorkAssignments.managerEmployeeId,
      assignmentStatus: hrmWorkAssignments.assignmentStatus,
    })
    .from(hrmWorkAssignments)
    .where(and(eq(hrmWorkAssignments.orgId, orgId), eq(hrmWorkAssignments.employmentId, employmentId)))
    .orderBy(asc(hrmWorkAssignments.effectiveFrom));

  const items: EmploymentTimelineItem[] = [
    {
      kind: "employment" as const,
      occurredAt: employment.startDate ?? employment.hireDate ?? new Date(0).toISOString(),
      title: "Employment started",
      status: employment.employmentStatus,
      reasonCode: null,
      employmentId: employment.employmentId,
      workAssignmentId: null,
      legalEntityId: employment.legalEntityId,
      departmentId: null,
      positionId: null,
      jobId: null,
      gradeId: null,
      managerEmployeeId: null,
      effectiveTo: null,
    },
    ...statusHistory.map((row) => ({
      kind: "status" as const,
      occurredAt: row.changedAt,
      title: `Status changed to ${row.newStatus}`,
      status: row.newStatus,
      reasonCode: row.reasonCode ?? null,
      employmentId: employment.employmentId,
      workAssignmentId: null,
      legalEntityId: employment.legalEntityId,
      departmentId: null,
      positionId: null,
      jobId: null,
      gradeId: null,
      managerEmployeeId: null,
      effectiveTo: null,
    })),
    ...assignments.map((row) => ({
      kind: "assignment" as const,
      occurredAt: row.effectiveFrom.toISOString(),
      title: "Work assignment recorded",
      status: row.assignmentStatus,
      reasonCode: row.changeReason ?? null,
      employmentId: employment.employmentId,
      workAssignmentId: row.workAssignmentId,
      legalEntityId: row.legalEntityId,
      departmentId: row.departmentId ?? null,
      positionId: row.positionId ?? null,
      jobId: row.jobId ?? null,
      gradeId: row.gradeId ?? null,
      managerEmployeeId: row.managerEmployeeId ?? null,
      effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
    })),
  ].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  return {
    employmentId: employment.employmentId,
    employeeId: employment.employeeId,
    employmentNumber: employment.employmentNumber,
    employmentStatus: employment.employmentStatus,
    hireDate: employment.hireDate,
    startDate: employment.startDate,
    terminationDate: employment.terminationDate,
    items,
  };
}