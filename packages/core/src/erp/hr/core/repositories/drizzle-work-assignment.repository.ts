import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { hrmWorkAssignments } from "@afenda/db";
import type {
  WorkAssignmentRecord,
  WorkAssignmentRepository,
} from "./work-assignment.repository";

type DbExecutor = {
  query: {
    hrmWorkAssignments: {
      findFirst: (args: unknown) => Promise<unknown>;
      findMany: (args: unknown) => Promise<unknown[]>;
    };
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<unknown[]>;
    };
  };
  update: (table: unknown) => {
    set: (values: unknown) => {
      where: (clause: unknown) => Promise<unknown>;
    };
  };
};

type WorkAssignmentRow = {
  id: string;
  orgId: string;
  employmentId: string;
  legalEntityId: string;
  businessUnitId: string | null;
  departmentId: string | null;
  costCenterId: string | null;
  positionId: string | null;
  jobId: string | null;
  gradeId: string | null;
  managerEmployeeId: string | null;
  fteRatio: string;
  assignmentStatus: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  changeReason: string | null;
};

function mapAssignment(row: WorkAssignmentRow): WorkAssignmentRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    employmentId: row.employmentId,
    legalEntityId: row.legalEntityId,
    businessUnitId: row.businessUnitId,
    departmentId: row.departmentId,
    costCenterId: row.costCenterId,
    locationId: null,
    positionId: row.positionId,
    jobId: row.jobId,
    gradeId: row.gradeId,
    managerEmployeeId: row.managerEmployeeId,
    workScheduleId: null,
    employmentClass: null,
    fteRatio: row.fteRatio,
    assignmentStatus: row.assignmentStatus,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    isCurrent: row.isCurrent,
    changeReason: row.changeReason,
  };
}

export class DrizzleWorkAssignmentRepository implements WorkAssignmentRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findCurrentByEmploymentId(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
  }): Promise<WorkAssignmentRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = (await db.query.hrmWorkAssignments.findFirst({
      where: and(
        eq(hrmWorkAssignments.orgId, args.orgId),
        eq(hrmWorkAssignments.employmentId, args.employmentId),
        eq(hrmWorkAssignments.isCurrent, true),
      ),
    })) as WorkAssignmentRow | undefined;

    return row ? mapAssignment(row) : null;
  }

  async findOverlappingAssignments(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }): Promise<WorkAssignmentRecord[]> {
    const db = this.getExecutor(args.tx);

    const rows = (await db.query.hrmWorkAssignments.findMany({
      where: and(
        eq(hrmWorkAssignments.orgId, args.orgId),
        eq(hrmWorkAssignments.employmentId, args.employmentId),
        lte(
          hrmWorkAssignments.effectiveFrom,
          sql`${args.effectiveTo ?? "9999-12-31"}::timestamptz`,
        ),
        or(
          isNull(hrmWorkAssignments.effectiveTo),
          gte(hrmWorkAssignments.effectiveTo, sql`${args.effectiveFrom}::timestamptz`),
        ),
      ),
    })) as WorkAssignmentRow[];

    return rows.map(mapAssignment);
  }

  async insert(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    employmentId: string;
    legalEntityId: string;
    businessUnitId?: string;
    departmentId?: string;
    costCenterId?: string;
    locationId?: string;
    positionId?: string;
    jobId?: string;
    gradeId?: string;
    managerEmployeeId?: string;
    workScheduleId?: string;
    employmentClass?: string;
    fteRatio?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    changeReason: string;
  }): Promise<WorkAssignmentRecord> {
    const db = this.getExecutor(args.tx);

    const rows = (await db
      .insert(hrmWorkAssignments)
      .values({
        orgId: args.orgId,
        employmentId: args.employmentId,
        legalEntityId: args.legalEntityId,
        businessUnitId: args.businessUnitId,
        departmentId: args.departmentId,
        costCenterId: args.costCenterId,
        positionId: args.positionId,
        jobId: args.jobId,
        gradeId: args.gradeId,
        managerEmployeeId: args.managerEmployeeId,
        fteRatio: args.fteRatio ?? "1.0000",
        assignmentStatus: "active",
        effectiveFrom: args.effectiveFrom,
        effectiveTo: args.effectiveTo,
        isCurrent: !args.effectiveTo,
        changeReason: args.changeReason,
      })
      .returning()) as WorkAssignmentRow[];

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to insert work assignment");
    }

    return mapAssignment(row);
  }

  async closeCurrentAssignment(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
    effectiveTo: string;
    actorUserId: string;
  }): Promise<void> {
    const db = this.getExecutor(args.tx);

    await db
      .update(hrmWorkAssignments)
      .set({
        effectiveTo: args.effectiveTo,
        isCurrent: false,
        assignmentStatus: "historical",
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmWorkAssignments.orgId, args.orgId),
          eq(hrmWorkAssignments.employmentId, args.employmentId),
          eq(hrmWorkAssignments.isCurrent, true),
        ),
      );
  }
}
