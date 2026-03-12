import { and, eq, inArray, sql } from "drizzle-orm";
import {
  hrmEmploymentRecords,
  hrmEmploymentStatusHistory,
} from "@afenda/db";
import type {
  EmploymentRecord,
  EmploymentRepository,
} from "./employment.repository";

type DbExecutor = {
  query: {
    hrmEmploymentRecords: {
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

type EmploymentRow = {
  id: string;
  orgId: string;
  employeeId: string;
  legalEntityId: string;
  employmentNumber: string;
  employmentType: string;
  hireDate: string;
  startDate: string;
  probationEndDate: string | null;
  confirmationDate?: string | null;
  terminationDate: string | null;
  employmentStatus: string;
  payrollStatus: string;
  isPrimary: boolean;
};

function mapEmployment(row: EmploymentRow): EmploymentRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    employeeId: row.employeeId,
    legalEntityId: row.legalEntityId,
    employmentNumber: row.employmentNumber,
    employmentType: row.employmentType,
    hireDate: row.hireDate,
    startDate: row.startDate,
    probationEndDate: row.probationEndDate,
    confirmationDate: row.confirmationDate ?? null,
    terminationDate: row.terminationDate,
    terminationReasonCode: null,
    employmentStatus: row.employmentStatus,
    payrollStatus: row.payrollStatus,
    isPrimary: row.isPrimary,
  };
}

export class DrizzleEmploymentRepository implements EmploymentRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findById(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
  }): Promise<EmploymentRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = (await db.query.hrmEmploymentRecords.findFirst({
      where: and(
        eq(hrmEmploymentRecords.orgId, args.orgId),
        eq(hrmEmploymentRecords.id, args.employmentId),
      ),
    })) as EmploymentRow | undefined;

    return row ? mapEmployment(row) : null;
  }

  async existsActiveEmploymentForEmployee(args: {
    tx?: unknown;
    orgId: string;
    employeeId: string;
  }): Promise<boolean> {
    const db = this.getExecutor(args.tx);

    const rows = (await db.query.hrmEmploymentRecords.findMany({
      where: and(
        eq(hrmEmploymentRecords.orgId, args.orgId),
        eq(hrmEmploymentRecords.employeeId, args.employeeId),
        inArray(hrmEmploymentRecords.employmentStatus, ["active", "probation", "suspended"]),
      ),
      limit: 1,
    })) as EmploymentRow[];

    return rows.length > 0;
  }

  async insert(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    employeeId: string;
    legalEntityId: string;
    employmentNumber: string;
    employmentType: string;
    hireDate: string;
    startDate: string;
    probationEndDate?: string;
  }): Promise<EmploymentRecord> {
    const db = this.getExecutor(args.tx);

    const rows = (await db
      .insert(hrmEmploymentRecords)
      .values({
        orgId: args.orgId,
        employeeId: args.employeeId,
        legalEntityId: args.legalEntityId,
        employmentNumber: args.employmentNumber,
        employmentType: args.employmentType,
        hireDate: args.hireDate,
        startDate: args.startDate,
        probationEndDate: args.probationEndDate,
        employmentStatus: "active",
        payrollStatus: "inactive",
        isPrimary: true,
      })
      .returning()) as EmploymentRow[];

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to insert employment");
    }

    return mapEmployment(row);
  }

  async updateStatus(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
    employmentStatus: string;
    terminationDate?: string;
    terminationReasonCode?: string;
    actorUserId: string;
  }): Promise<void> {
    const db = this.getExecutor(args.tx);

    await db
      .update(hrmEmploymentRecords)
      .set({
        employmentStatus: args.employmentStatus,
        terminationDate: args.terminationDate,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, args.orgId),
          eq(hrmEmploymentRecords.id, args.employmentId),
        ),
      );
  }

  async insertStatusHistory(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    employmentId: string;
    oldStatus: string | null;
    newStatus: string;
    changedAt: string;
    reasonCode: string;
    comment?: string;
  }): Promise<void> {
    const db = this.getExecutor(args.tx);

    await db.insert(hrmEmploymentStatusHistory).values({
      orgId: args.orgId,
      employmentId: args.employmentId,
      oldStatus: args.oldStatus,
      newStatus: args.newStatus,
      changedAt: args.changedAt,
      changedBy: args.actorUserId,
      reasonCode: args.reasonCode,
      metadata: args.comment ? { comment: args.comment } : undefined,
    });
  }
}
