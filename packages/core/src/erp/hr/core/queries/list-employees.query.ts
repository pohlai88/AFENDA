import type { DbClient } from "@afenda/db";
import {
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmPersons,
  hrmWorkAssignments,
} from "@afenda/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";

export interface EmployeeListItemView {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  workerType: string;
  currentStatus: string;
  employmentId: string | null;
  employmentStatus: string | null;
  legalEntityId: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerEmployeeId: string | null;
}

export interface ListEmployeesQueryInput {
  orgId: string;
  search?: string;
  employmentStatus?: string;
  workerType?: string;
  limit?: number;
  offset?: number;
}

export interface ListEmployeesQueryResult {
  items: EmployeeListItemView[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListEmployeesQuery {
  execute(input: ListEmployeesQueryInput): Promise<ListEmployeesQueryResult>;
}

export async function listEmployees(
  db: DbClient,
  input: ListEmployeesQueryInput,
): Promise<ListEmployeesQueryResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const filters = [eq(hrmEmployeeProfiles.orgId, input.orgId)];

  if (input.workerType) {
    filters.push(eq(hrmEmployeeProfiles.workerType, input.workerType as never));
  }

  if (input.search) {
    filters.push(
      or(
        ilike(hrmEmployeeProfiles.employeeCode, `%${input.search}%`),
        ilike(hrmPersons.displayName, `%${input.search}%`),
        ilike(hrmPersons.legalName, `%${input.search}%`),
      )!,
    );
  }

  if (input.employmentStatus) {
    filters.push(eq(hrmEmploymentRecords.employmentStatus, input.employmentStatus as never));
  }

  const items = await db
    .select({
      employeeId: hrmEmployeeProfiles.id,
      employeeCode: hrmEmployeeProfiles.employeeCode,
      displayName: hrmPersons.displayName,
      legalName: hrmPersons.legalName,
      workerType: hrmEmployeeProfiles.workerType,
      currentStatus: hrmEmployeeProfiles.currentStatus,
      employmentId: hrmEmploymentRecords.id,
      employmentStatus: hrmEmploymentRecords.employmentStatus,
      legalEntityId: hrmEmploymentRecords.legalEntityId,
      departmentId: hrmWorkAssignments.departmentId,
      positionId: hrmWorkAssignments.positionId,
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
    .where(and(...filters))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(hrmEmployeeProfiles)
    .innerJoin(hrmPersons, and(eq(hrmPersons.orgId, hrmEmployeeProfiles.orgId), eq(hrmPersons.id, hrmEmployeeProfiles.personId)))
    .leftJoin(
      hrmEmploymentRecords,
      and(
        eq(hrmEmploymentRecords.orgId, hrmEmployeeProfiles.orgId),
        eq(hrmEmploymentRecords.id, hrmEmployeeProfiles.primaryEmploymentId),
      ),
    )
    .where(and(...filters));

  return {
    items: items.map((row) => ({
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      displayName: row.displayName ?? row.legalName,
      workerType: row.workerType,
      currentStatus: row.currentStatus,
      employmentId: row.employmentId ?? null,
      employmentStatus: row.employmentStatus ?? null,
      legalEntityId: row.legalEntityId ?? null,
      departmentId: row.departmentId ?? null,
      positionId: row.positionId ?? null,
      managerEmployeeId: row.managerEmployeeId ?? null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}