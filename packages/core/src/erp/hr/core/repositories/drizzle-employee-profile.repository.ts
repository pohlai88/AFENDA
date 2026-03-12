import { and, eq, sql } from "drizzle-orm";
import { hrmEmployeeProfiles } from "@afenda/db";
import type {
  EmployeeProfileRecord,
  EmployeeProfileRepository,
} from "./employee-profile.repository";

type DbExecutor = {
  query: {
    hrmEmployeeProfiles: {
      findFirst: (args: unknown) => Promise<unknown>;
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

type EmployeeProfileRow = {
  id: string;
  orgId: string;
  personId: string;
  employeeCode: string;
  workerType: EmployeeProfileRecord["workerType"];
  currentStatus: string;
  primaryLegalEntityId: string | null;
  primaryEmploymentId: string | null;
};

function mapEmployeeProfile(row: EmployeeProfileRow): EmployeeProfileRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    personId: row.personId,
    employeeCode: row.employeeCode,
    workerType: row.workerType,
    currentStatus: row.currentStatus,
    primaryLegalEntityId: row.primaryLegalEntityId,
    primaryEmploymentId: row.primaryEmploymentId,
  };
}

export class DrizzleEmployeeProfileRepository implements EmployeeProfileRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findById(args: {
    tx?: unknown;
    orgId: string;
    employeeId: string;
  }): Promise<EmployeeProfileRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = (await db.query.hrmEmployeeProfiles.findFirst({
      where: and(
        eq(hrmEmployeeProfiles.orgId, args.orgId),
        eq(hrmEmployeeProfiles.id, args.employeeId),
      ),
    })) as EmployeeProfileRow | undefined;

    return row ? mapEmployeeProfile(row) : null;
  }

  async findByPersonId(args: {
    tx?: unknown;
    orgId: string;
    personId: string;
  }): Promise<EmployeeProfileRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = (await db.query.hrmEmployeeProfiles.findFirst({
      where: and(
        eq(hrmEmployeeProfiles.orgId, args.orgId),
        eq(hrmEmployeeProfiles.personId, args.personId),
      ),
    })) as EmployeeProfileRow | undefined;

    return row ? mapEmployeeProfile(row) : null;
  }

  async insert(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    personId: string;
    employeeCode: string;
    workerType: EmployeeProfileRecord["workerType"];
    legalEntityId: string;
  }): Promise<EmployeeProfileRecord> {
    const db = this.getExecutor(args.tx);

    const rows = (await db
      .insert(hrmEmployeeProfiles)
      .values({
        orgId: args.orgId,
        personId: args.personId,
        employeeCode: args.employeeCode,
        workerType: args.workerType,
        primaryLegalEntityId: args.legalEntityId,
        currentStatus: "active",
      })
      .returning()) as EmployeeProfileRow[];

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to insert employee profile");
    }

    return mapEmployeeProfile(row);
  }

  async updatePrimaryEmploymentId(args: {
    tx?: unknown;
    orgId: string;
    employeeId: string;
    primaryEmploymentId: string;
  }): Promise<void> {
    const db = this.getExecutor(args.tx);

    await db
      .update(hrmEmployeeProfiles)
      .set({
        primaryEmploymentId: args.primaryEmploymentId,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmEmployeeProfiles.orgId, args.orgId),
          eq(hrmEmployeeProfiles.id, args.employeeId),
        ),
      );
  }
}
