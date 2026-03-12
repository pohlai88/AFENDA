import type { DbClient } from "@afenda/db";
import {
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmOrgUnits,
  hrmPersons,
  hrmPositions,
  hrmWorkAssignments,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface EmployeeProfileView {
  employeeId: string;
  employeeCode: string;
  personId: string;
  displayName: string;
  legalName: string;
  personalEmail: string | null;
  mobilePhone: string | null;
  workerType: string;
  currentStatus: string;
  employmentId: string | null;
  employmentNumber: string | null;
  employmentStatus: string | null;
  legalEntityId: string | null;
  hireDate: string | null;
  startDate: string | null;
  terminationDate: string | null;
  workAssignmentId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionTitle: string | null;
  jobId: string | null;
  gradeId: string | null;
  managerEmployeeId: string | null;
  managerEmployeeCode: string | null;
  managerDisplayName: string | null;
}

export interface GetEmployeeProfileQuery {
  execute(args: {
    orgId: string;
    employeeId: string;
  }): Promise<EmployeeProfileView | null>;
}

export async function getEmployeeProfile(
  db: DbClient,
  orgId: string,
  employeeId: string,
): Promise<EmployeeProfileView | null> {
  const rows = await db
    .select({
      employeeId: hrmEmployeeProfiles.id,
      employeeCode: hrmEmployeeProfiles.employeeCode,
      personId: hrmEmployeeProfiles.personId,
      displayName: hrmPersons.displayName,
      legalName: hrmPersons.legalName,
      personalEmail: hrmPersons.personalEmail,
      mobilePhone: hrmPersons.mobilePhone,
      workerType: hrmEmployeeProfiles.workerType,
      currentStatus: hrmEmployeeProfiles.currentStatus,
      employmentId: hrmEmploymentRecords.id,
      employmentNumber: hrmEmploymentRecords.employmentNumber,
      employmentStatus: hrmEmploymentRecords.employmentStatus,
      legalEntityId: hrmEmploymentRecords.legalEntityId,
      hireDate: hrmEmploymentRecords.hireDate,
      startDate: hrmEmploymentRecords.startDate,
      terminationDate: hrmEmploymentRecords.terminationDate,
      workAssignmentId: hrmWorkAssignments.id,
      departmentId: hrmWorkAssignments.departmentId,
      departmentName: hrmOrgUnits.orgUnitName,
      positionId: hrmWorkAssignments.positionId,
      positionTitle: hrmPositions.positionTitle,
      jobId: hrmWorkAssignments.jobId,
      gradeId: hrmWorkAssignments.gradeId,
      managerEmployeeId: hrmWorkAssignments.managerEmployeeId,
    })
    .from(hrmEmployeeProfiles)
    .innerJoin(hrmPersons, and(eq(hrmPersons.orgId, hrmEmployeeProfiles.orgId), eq(hrmPersons.id, hrmEmployeeProfiles.personId)))
    .leftJoin(
      hrmEmploymentRecords,
      and(
        eq(hrmEmploymentRecords.orgId, hrmEmployeeProfiles.orgId),
        eq(hrmEmploymentRecords.id, hrmEmployeeProfiles.primaryEmploymentId),
      ),
    )
    .leftJoin(
      hrmWorkAssignments,
      and(
        eq(hrmWorkAssignments.orgId, hrmEmployeeProfiles.orgId),
        eq(hrmWorkAssignments.employmentId, hrmEmploymentRecords.id),
        eq(hrmWorkAssignments.isCurrent, true),
      ),
    )
    .leftJoin(
      hrmOrgUnits,
      and(
        eq(hrmOrgUnits.orgId, hrmWorkAssignments.orgId),
        eq(hrmOrgUnits.id, hrmWorkAssignments.departmentId),
      ),
    )
    .leftJoin(
      hrmPositions,
      and(
        eq(hrmPositions.orgId, hrmWorkAssignments.orgId),
        eq(hrmPositions.id, hrmWorkAssignments.positionId),
      ),
    )
    .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, employeeId)));

  const row = rows[0];
  if (!row) {
    return null;
  }

  let managerEmployeeCode: string | null = null;
  let managerDisplayName: string | null = null;

  if (row.managerEmployeeId) {
    const managerRows = await db
      .select({
        managerEmployeeCode: hrmEmployeeProfiles.employeeCode,
        managerDisplayName: hrmPersons.displayName,
        managerLegalName: hrmPersons.legalName,
      })
      .from(hrmEmployeeProfiles)
      .innerJoin(
        hrmPersons,
        and(
          eq(hrmPersons.orgId, hrmEmployeeProfiles.orgId),
          eq(hrmPersons.id, hrmEmployeeProfiles.personId),
        ),
      )
      .where(
        and(
          eq(hrmEmployeeProfiles.orgId, orgId),
          eq(hrmEmployeeProfiles.id, row.managerEmployeeId),
        ),
      );

    const manager = managerRows[0];
    if (manager) {
      managerEmployeeCode = manager.managerEmployeeCode;
      managerDisplayName = manager.managerDisplayName ?? manager.managerLegalName;
    }
  }

  return {
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    personId: row.personId,
    displayName: row.displayName ?? row.legalName,
    legalName: row.legalName,
    personalEmail: row.personalEmail,
    mobilePhone: row.mobilePhone,
    workerType: row.workerType,
    currentStatus: row.currentStatus,
    employmentId: row.employmentId ?? null,
    employmentNumber: row.employmentNumber ?? null,
    employmentStatus: row.employmentStatus ?? null,
    legalEntityId: row.legalEntityId ?? null,
    hireDate: row.hireDate ?? null,
    startDate: row.startDate ?? null,
    terminationDate: row.terminationDate ?? null,
    workAssignmentId: row.workAssignmentId ?? null,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentName ?? null,
    positionId: row.positionId ?? null,
    positionTitle: row.positionTitle ?? null,
    jobId: row.jobId ?? null,
    gradeId: row.gradeId ?? null,
    managerEmployeeId: row.managerEmployeeId ?? null,
    managerEmployeeCode,
    managerDisplayName,
  };
}