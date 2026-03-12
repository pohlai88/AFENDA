import type { DbClient } from "@afenda/db";
import {
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmPositions,
  hrmWorkAssignments,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface PositionIncumbent {
  employmentId: string;
  employeeId: string;
  employeeCode: string;
  employmentStatus: string;
  assignmentId: string;
  effectiveFrom: string;
}

export interface PositionIncumbencyView {
  positionId: string;
  positionCode: string;
  positionTitle: string;
  legalEntityId: string;
  positionStatus: string;
  headcountLimit: number;
  incumbents: PositionIncumbent[];
}

export async function getPositionIncumbency(
  db: DbClient,
  orgId: string,
  positionId: string,
): Promise<PositionIncumbencyView | null> {
  const [position] = await db
    .select({
      positionId: hrmPositions.id,
      positionCode: hrmPositions.positionCode,
      positionTitle: hrmPositions.positionTitle,
      legalEntityId: hrmPositions.legalEntityId,
      positionStatus: hrmPositions.positionStatus,
      headcountLimit: hrmPositions.headcountLimit,
    })
    .from(hrmPositions)
    .where(and(eq(hrmPositions.orgId, orgId), eq(hrmPositions.id, positionId)));

  if (!position) return null;

  const rows = await db
    .select({
      employmentId: hrmEmploymentRecords.id,
      employeeId: hrmEmployeeProfiles.id,
      employeeCode: hrmEmployeeProfiles.employeeCode,
      employmentStatus: hrmEmploymentRecords.employmentStatus,
      assignmentId: hrmWorkAssignments.id,
      effectiveFrom: hrmWorkAssignments.effectiveFrom,
    })
    .from(hrmWorkAssignments)
    .innerJoin(
      hrmEmploymentRecords,
      and(
        eq(hrmEmploymentRecords.orgId, hrmWorkAssignments.orgId),
        eq(hrmEmploymentRecords.id, hrmWorkAssignments.employmentId),
      ),
    )
    .innerJoin(
      hrmEmployeeProfiles,
      and(
        eq(hrmEmployeeProfiles.orgId, hrmEmploymentRecords.orgId),
        eq(hrmEmployeeProfiles.id, hrmEmploymentRecords.employeeId),
      ),
    )
    .where(
      and(
        eq(hrmWorkAssignments.orgId, orgId),
        eq(hrmWorkAssignments.positionId, positionId),
        eq(hrmWorkAssignments.isCurrent, true),
      ),
    );

  return {
    ...position,
    incumbents: rows.map((row) => ({
      ...row,
      effectiveFrom: row.effectiveFrom.toISOString(),
    })),
  };
}