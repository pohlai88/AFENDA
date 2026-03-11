Good. Here is the **next drop-in batch** for AFENDA HRM Phase 1:

1. repository interfaces + Drizzle-style implementations
2. `create-person.service.ts`
3. `transfer-employee.service.ts`
4. `apps/api/src/routes/erp/hr/create-person.ts`
5. `apps/api/src/routes/erp/hr/transfer-employee.ts`

This keeps building the **Workforce Truth Engine** in the right order.

---

# 1) `packages/core/src/erp/hr/core/repositories/person.repository.ts`

```ts
export interface PersonRecord {
  id: string;
  tenantId: string;
  personCode: string;
  legalName: string;
  preferredName: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string | null;
  birthDate: string | null;
  genderCode: string | null;
  maritalStatusCode: string | null;
  nationalityCountryCode: string | null;
  personalEmail: string | null;
  mobilePhone: string | null;
  status: string;
}

export interface CreatePersonParams {
  tenantId: string;
  actorUserId: string;
  personCode: string;
  legalName: string;
  preferredName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  birthDate?: string;
  genderCode?: string;
  maritalStatusCode?: string;
  nationalityCountryCode?: string;
  personalEmail?: string;
  mobilePhone?: string;
  metadata?: Record<string, unknown>;
}

export interface PersonRepository {
  findById(args: {
    tx?: unknown;
    tenantId: string;
    personId: string;
  }): Promise<PersonRecord | null>;

  findByPersonCode(args: {
    tx?: unknown;
    tenantId: string;
    personCode: string;
  }): Promise<PersonRecord | null>;

  insert(args: {
    tx?: unknown;
    params: CreatePersonParams;
  }): Promise<PersonRecord>;
}
```

---

# 2) `packages/core/src/erp/hr/core/repositories/employee-profile.repository.ts`

```ts
export interface EmployeeProfileRecord {
  id: string;
  tenantId: string;
  personId: string;
  employeeCode: string;
  workerType: "employee" | "contractor" | "intern" | "director";
  currentStatus: string;
  primaryLegalEntityId: string | null;
  primaryEmploymentId: string | null;
}

export interface EmployeeProfileRepository {
  findById(args: {
    tx?: unknown;
    tenantId: string;
    employeeId: string;
  }): Promise<EmployeeProfileRecord | null>;

  findByPersonId(args: {
    tx?: unknown;
    tenantId: string;
    personId: string;
  }): Promise<EmployeeProfileRecord | null>;

  insert(args: {
    tx?: unknown;
    tenantId: string;
    actorUserId: string;
    personId: string;
    employeeCode: string;
    workerType: EmployeeProfileRecord["workerType"];
    legalEntityId: string;
  }): Promise<EmployeeProfileRecord>;

  updatePrimaryEmploymentId(args: {
    tx?: unknown;
    tenantId: string;
    employeeId: string;
    primaryEmploymentId: string;
  }): Promise<void>;
}
```

---

# 3) `packages/core/src/erp/hr/core/repositories/employment.repository.ts`

```ts
export interface EmploymentRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  legalEntityId: string;
  employmentNumber: string;
  employmentType: string;
  hireDate: string;
  startDate: string;
  probationEndDate: string | null;
  confirmationDate: string | null;
  terminationDate: string | null;
  terminationReasonCode: string | null;
  employmentStatus: string;
  payrollStatus: string;
  isPrimary: boolean;
}

export interface EmploymentRepository {
  findById(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
  }): Promise<EmploymentRecord | null>;

  existsActiveEmploymentForEmployee(args: {
    tx?: unknown;
    tenantId: string;
    employeeId: string;
  }): Promise<boolean>;

  insert(args: {
    tx?: unknown;
    tenantId: string;
    actorUserId: string;
    employeeId: string;
    legalEntityId: string;
    employmentNumber: string;
    employmentType: string;
    hireDate: string;
    startDate: string;
    probationEndDate?: string;
  }): Promise<EmploymentRecord>;

  updateStatus(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
    employmentStatus: string;
    terminationDate?: string;
    terminationReasonCode?: string;
    actorUserId: string;
  }): Promise<void>;

  insertStatusHistory(args: {
    tx?: unknown;
    tenantId: string;
    actorUserId: string;
    employmentId: string;
    oldStatus: string | null;
    newStatus: string;
    changedAt: string;
    reasonCode: string;
    comment?: string;
  }): Promise<void>;
}
```

---

# 4) `packages/core/src/erp/hr/core/repositories/work-assignment.repository.ts`

```ts
export interface WorkAssignmentRecord {
  id: string;
  tenantId: string;
  employmentId: string;
  legalEntityId: string;
  businessUnitId: string | null;
  departmentId: string | null;
  costCenterId: string | null;
  locationId: string | null;
  positionId: string | null;
  jobId: string | null;
  gradeId: string | null;
  managerEmployeeId: string | null;
  workScheduleId: string | null;
  employmentClass: string | null;
  fteRatio: string;
  assignmentStatus: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  changeReason: string | null;
}

export interface WorkAssignmentRepository {
  findCurrentByEmploymentId(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
  }): Promise<WorkAssignmentRecord | null>;

  findOverlappingAssignments(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }): Promise<WorkAssignmentRecord[]>;

  insert(args: {
    tx?: unknown;
    tenantId: string;
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
  }): Promise<WorkAssignmentRecord>;

  closeCurrentAssignment(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
    effectiveTo: string;
    actorUserId: string;
  }): Promise<void>;
}
```

---

# 5) `packages/core/src/erp/hr/core/repositories/drizzle-person.repository.ts`

```ts
import { and, eq } from "drizzle-orm";
import { hrmPersons } from "@afenda/db/schema/erp/hrm";
import type {
  CreatePersonParams,
  PersonRecord,
  PersonRepository,
} from "@afenda/core/erp/hr/core/repositories/person.repository";

type DbExecutor = {
  query: {
    hrmPersons: {
      findFirst: (args: unknown) => Promise<any>;
    };
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<any[]>;
    };
  };
};

function mapPerson(row: any): PersonRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    personCode: row.personCode,
    legalName: row.legalName,
    preferredName: row.preferredName ?? null,
    firstName: row.firstName,
    middleName: row.middleName ?? null,
    lastName: row.lastName,
    displayName: row.displayName ?? null,
    birthDate: row.birthDate ?? null,
    genderCode: row.genderCode ?? null,
    maritalStatusCode: row.maritalStatusCode ?? null,
    nationalityCountryCode: row.nationalityCountryCode ?? null,
    personalEmail: row.personalEmail ?? null,
    mobilePhone: row.mobilePhone ?? null,
    status: row.status,
  };
}

export class DrizzlePersonRepository implements PersonRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findById(args: {
    tx?: unknown;
    tenantId: string;
    personId: string;
  }): Promise<PersonRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = await db.query.hrmPersons.findFirst({
      where: and(eq(hrmPersons.tenantId, args.tenantId), eq(hrmPersons.id, args.personId)),
    });

    return row ? mapPerson(row) : null;
  }

  async findByPersonCode(args: {
    tx?: unknown;
    tenantId: string;
    personCode: string;
  }): Promise<PersonRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = await db.query.hrmPersons.findFirst({
      where: and(
        eq(hrmPersons.tenantId, args.tenantId),
        eq(hrmPersons.personCode, args.personCode),
      ),
    });

    return row ? mapPerson(row) : null;
  }

  async insert(args: {
    tx?: unknown;
    params: CreatePersonParams;
  }): Promise<PersonRecord> {
    const db = this.getExecutor(args.tx);
    const p = args.params;

    const [row] = await db
      .insert(hrmPersons)
      .values({
        tenantId: p.tenantId,
        createdBy: p.actorUserId,
        updatedBy: p.actorUserId,
        personCode: p.personCode,
        legalName: p.legalName,
        preferredName: p.preferredName,
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        displayName: p.displayName,
        birthDate: p.birthDate,
        genderCode: p.genderCode,
        maritalStatusCode: p.maritalStatusCode,
        nationalityCountryCode: p.nationalityCountryCode,
        personalEmail: p.personalEmail,
        mobilePhone: p.mobilePhone,
        metadata: p.metadata,
      })
      .returning();

    return mapPerson(row);
  }
}
```

---

# 6) `packages/core/src/erp/hr/core/repositories/drizzle-employee-profile.repository.ts`

```ts
import { and, eq } from "drizzle-orm";
import { hrmEmployeeProfiles } from "@afenda/db/schema/erp/hrm";
import type {
  EmployeeProfileRecord,
  EmployeeProfileRepository,
} from "@afenda/core/erp/hr/core/repositories/employee-profile.repository";

type DbExecutor = {
  query: {
    hrmEmployeeProfiles: {
      findFirst: (args: unknown) => Promise<any>;
    };
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<any[]>;
    };
  };
  update: (table: unknown) => {
    set: (values: unknown) => {
      where: (clause: unknown) => Promise<void>;
    };
  };
};

function mapEmployeeProfile(row: any): EmployeeProfileRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    personId: row.personId,
    employeeCode: row.employeeCode,
    workerType: row.workerType,
    currentStatus: row.currentStatus,
    primaryLegalEntityId: row.primaryLegalEntityId ?? null,
    primaryEmploymentId: row.primaryEmploymentId ?? null,
  };
}

export class DrizzleEmployeeProfileRepository implements EmployeeProfileRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findById(args: {
    tx?: unknown;
    tenantId: string;
    employeeId: string;
  }): Promise<EmployeeProfileRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = await db.query.hrmEmployeeProfiles.findFirst({
      where: and(
        eq(hrmEmployeeProfiles.tenantId, args.tenantId),
        eq(hrmEmployeeProfiles.id, args.employeeId),
      ),
    });

    return row ? mapEmployeeProfile(row) : null;
  }

  async findByPersonId(args: {
    tx?: unknown;
    tenantId: string;
    personId: string;
  }): Promise<EmployeeProfileRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = await db.query.hrmEmployeeProfiles.findFirst({
      where: and(
        eq(hrmEmployeeProfiles.tenantId, args.tenantId),
        eq(hrmEmployeeProfiles.personId, args.personId),
      ),
    });

    return row ? mapEmployeeProfile(row) : null;
  }

  async insert(args: {
    tx?: unknown;
    tenantId: string;
    actorUserId: string;
    personId: string;
    employeeCode: string;
    workerType: EmployeeProfileRecord["workerType"];
    legalEntityId: string;
  }): Promise<EmployeeProfileRecord> {
    const db = this.getExecutor(args.tx);

    const [row] = await db
      .insert(hrmEmployeeProfiles)
      .values({
        tenantId: args.tenantId,
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
        personId: args.personId,
        employeeCode: args.employeeCode,
        workerType: args.workerType,
        primaryLegalEntityId: args.legalEntityId,
        currentStatus: "active",
      })
      .returning();

    return mapEmployeeProfile(row);
  }

  async updatePrimaryEmploymentId(args: {
    tx?: unknown;
    tenantId: string;
    employeeId: string;
    primaryEmploymentId: string;
  }): Promise<void> {
    const db = this.getExecutor(args.tx);

    await db
      .update(hrmEmployeeProfiles)
      .set({
        primaryEmploymentId: args.primaryEmploymentId,
      })
      .where(
        and(
          eq(hrmEmployeeProfiles.tenantId, args.tenantId),
          eq(hrmEmployeeProfiles.id, args.employeeId),
        ),
      );
  }
}
```

---

# 7) `packages/core/src/erp/hr/core/repositories/drizzle-employment.repository.ts`

```ts
import { and, eq, inArray } from "drizzle-orm";
import {
  hrmEmploymentRecords,
  hrmEmploymentStatusHistory,
} from "@afenda/db/schema/erp/hrm";
import type {
  EmploymentRecord,
  EmploymentRepository,
} from "@afenda/core/erp/hr/core/repositories/employment.repository";

type DbExecutor = {
  query: {
    hrmEmploymentRecords: {
      findFirst: (args: unknown) => Promise<any>;
      findMany: (args: unknown) => Promise<any[]>;
    };
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<any[]>;
    };
  };
  update: (table: unknown) => {
    set: (values: unknown) => {
      where: (clause: unknown) => Promise<void>;
    };
  };
};

function mapEmployment(row: any): EmploymentRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeId: row.employeeId,
    legalEntityId: row.legalEntityId,
    employmentNumber: row.employmentNumber,
    employmentType: row.employmentType,
    hireDate: row.hireDate,
    startDate: row.startDate,
    probationEndDate: row.probationEndDate ?? null,
    confirmationDate: row.confirmationDate ?? null,
    terminationDate: row.terminationDate ?? null,
    terminationReasonCode: row.terminationReasonCode ?? null,
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
    tenantId: string;
    employmentId: string;
  }): Promise<EmploymentRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = await db.query.hrmEmploymentRecords.findFirst({
      where: and(
        eq(hrmEmploymentRecords.tenantId, args.tenantId),
        eq(hrmEmploymentRecords.id, args.employmentId),
      ),
    });

    return row ? mapEmployment(row) : null;
  }

  async existsActiveEmploymentForEmployee(args: {
    tx?: unknown;
    tenantId: string;
    employeeId: string;
  }): Promise<boolean> {
    const db = this.getExecutor(args.tx);

    const rows = await db.query.hrmEmploymentRecords.findMany({
      where: and(
        eq(hrmEmploymentRecords.tenantId, args.tenantId),
        eq(hrmEmploymentRecords.employeeId, args.employeeId),
        inArray(hrmEmploymentRecords.employmentStatus, ["active", "probation", "suspended"]),
      ),
      limit: 1,
    });

    return rows.length > 0;
  }

  async insert(args: {
    tx?: unknown;
    tenantId: string;
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

    const [row] = await db
      .insert(hrmEmploymentRecords)
      .values({
        tenantId: args.tenantId,
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
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
      .returning();

    return mapEmployment(row);
  }

  async updateStatus(args: {
    tx?: unknown;
    tenantId: string;
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
        terminationReasonCode: args.terminationReasonCode,
        updatedBy: args.actorUserId,
      })
      .where(
        and(
          eq(hrmEmploymentRecords.tenantId, args.tenantId),
          eq(hrmEmploymentRecords.id, args.employmentId),
        ),
      );
  }

  async insertStatusHistory(args: {
    tx?: unknown;
    tenantId: string;
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
      tenantId: args.tenantId,
      createdBy: args.actorUserId,
      updatedBy: args.actorUserId,
      employmentId: args.employmentId,
      oldStatus: args.oldStatus,
      newStatus: args.newStatus,
      changedAt: args.changedAt,
      changedBy: args.actorUserId,
      reasonCode: args.reasonCode,
      comment: args.comment,
    });
  }
}
```

---

# 8) `packages/core/src/erp/hr/core/repositories/drizzle-work-assignment.repository.ts`

```ts
import { and, eq, isNull, lte, or, gte } from "drizzle-orm";
import { hrmWorkAssignments } from "@afenda/db/schema/erp/hrm";
import type {
  WorkAssignmentRecord,
  WorkAssignmentRepository,
} from "@afenda/core/erp/hr/core/repositories/work-assignment.repository";

type DbExecutor = {
  query: {
    hrmWorkAssignments: {
      findFirst: (args: unknown) => Promise<any>;
      findMany: (args: unknown) => Promise<any[]>;
    };
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<any[]>;
    };
  };
  update: (table: unknown) => {
    set: (values: unknown) => {
      where: (clause: unknown) => Promise<void>;
    };
  };
};

function mapAssignment(row: any): WorkAssignmentRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employmentId: row.employmentId,
    legalEntityId: row.legalEntityId,
    businessUnitId: row.businessUnitId ?? null,
    departmentId: row.departmentId ?? null,
    costCenterId: row.costCenterId ?? null,
    locationId: row.locationId ?? null,
    positionId: row.positionId ?? null,
    jobId: row.jobId ?? null,
    gradeId: row.gradeId ?? null,
    managerEmployeeId: row.managerEmployeeId ?? null,
    workScheduleId: row.workScheduleId ?? null,
    employmentClass: row.employmentClass ?? null,
    fteRatio: row.fteRatio,
    assignmentStatus: row.assignmentStatus,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? null,
    isCurrent: row.isCurrent,
    changeReason: row.changeReason ?? null,
  };
}

export class DrizzleWorkAssignmentRepository implements WorkAssignmentRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findCurrentByEmploymentId(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
  }): Promise<WorkAssignmentRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = await db.query.hrmWorkAssignments.findFirst({
      where: and(
        eq(hrmWorkAssignments.tenantId, args.tenantId),
        eq(hrmWorkAssignments.employmentId, args.employmentId),
        eq(hrmWorkAssignments.isCurrent, true),
      ),
    });

    return row ? mapAssignment(row) : null;
  }

  async findOverlappingAssignments(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }): Promise<WorkAssignmentRecord[]> {
    const db = this.getExecutor(args.tx);

    const rows = await db.query.hrmWorkAssignments.findMany({
      where: and(
        eq(hrmWorkAssignments.tenantId, args.tenantId),
        eq(hrmWorkAssignments.employmentId, args.employmentId),
        lte(hrmWorkAssignments.effectiveFrom, args.effectiveTo ?? "9999-12-31"),
        or(
          isNull(hrmWorkAssignments.effectiveTo),
          gte(hrmWorkAssignments.effectiveTo, args.effectiveFrom),
        ),
      ),
    });

    return rows.map(mapAssignment);
  }

  async insert(args: {
    tx?: unknown;
    tenantId: string;
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

    const [row] = await db
      .insert(hrmWorkAssignments)
      .values({
        tenantId: args.tenantId,
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
        employmentId: args.employmentId,
        legalEntityId: args.legalEntityId,
        businessUnitId: args.businessUnitId,
        departmentId: args.departmentId,
        costCenterId: args.costCenterId,
        locationId: args.locationId,
        positionId: args.positionId,
        jobId: args.jobId,
        gradeId: args.gradeId,
        managerEmployeeId: args.managerEmployeeId,
        workScheduleId: args.workScheduleId,
        employmentClass: args.employmentClass,
        fteRatio: args.fteRatio ?? "1.0000",
        assignmentStatus: "active",
        effectiveFrom: args.effectiveFrom,
        effectiveTo: args.effectiveTo,
        isCurrent: !args.effectiveTo,
        changeReason: args.changeReason,
      })
      .returning();

    return mapAssignment(row);
  }

  async closeCurrentAssignment(args: {
    tx?: unknown;
    tenantId: string;
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
        updatedBy: args.actorUserId,
      })
      .where(
        and(
          eq(hrmWorkAssignments.tenantId, args.tenantId),
          eq(hrmWorkAssignments.employmentId, args.employmentId),
          eq(hrmWorkAssignments.isCurrent, true),
        ),
      );
  }
}
```

---

# 9) `packages/core/src/erp/hr/core/dto/create-person.dto.ts`

```ts
export interface CreatePersonInput {
  personCode?: string;
  legalName: string;
  preferredName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  birthDate?: string;
  genderCode?: string;
  maritalStatusCode?: string;
  nationalityCountryCode?: string;
  personalEmail?: string;
  mobilePhone?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePersonOutput {
  personId: string;
  personCode: string;
}
```

---

# 10) `packages/core/src/erp/hr/core/dto/transfer-employee.dto.ts`

```ts
export interface TransferEmployeeInput {
  employmentId: string;
  effectiveFrom: string;
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
  changeReason: string;
}

export interface TransferEmployeeOutput {
  previousWorkAssignmentId: string;
  newWorkAssignmentId: string;
}
```

---

# 11) `packages/core/src/erp/hr/core/services/create-person.service.ts`

```ts
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import type { CreatePersonInput, CreatePersonOutput } from "../dto/create-person.dto";
import type { PersonRepository } from "../repositories/person.repository";

export interface CreatePersonDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  personRepository: PersonRepository;
  auditService: {
    record: (args: {
      tx?: unknown;
      tenantId: string;
      actorUserId: string;
      action: string;
      aggregateType: string;
      aggregateId: string;
      after: Record<string, unknown>;
      meta?: Record<string, unknown>;
    }) => Promise<void>;
  };
  outboxService: {
    enqueue: (args: {
      tx?: unknown;
      tenantId: string;
      eventName: string;
      aggregateType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>;
  };
  codeGenerator: {
    nextPersonCode: (tenantId: string) => Promise<string>;
  };
}

export class CreatePersonService {
  constructor(private readonly deps: CreatePersonDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: CreatePersonInput,
  ): Promise<HrmResult<CreatePersonOutput>> {
    if (!input.legalName || !input.firstName || !input.lastName) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "legalName, firstName, and lastName are required",
      );
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        const personCode =
          input.personCode ?? (await this.deps.codeGenerator.nextPersonCode(ctx.tenantId));

        const existing = await this.deps.personRepository.findByPersonCode({
          tx,
          tenantId: ctx.tenantId,
          personCode,
        });

        if (existing) {
          return err(
            HRM_ERROR_CODES.CONFLICT,
            "personCode already exists",
            { personCode },
          );
        }

        const person = await this.deps.personRepository.insert({
          tx,
          params: {
            tenantId: ctx.tenantId,
            actorUserId: ctx.actorUserId,
            personCode,
            legalName: input.legalName,
            preferredName: input.preferredName,
            firstName: input.firstName,
            middleName: input.middleName,
            lastName: input.lastName,
            displayName: input.displayName ?? input.legalName,
            birthDate: input.birthDate,
            genderCode: input.genderCode,
            maritalStatusCode: input.maritalStatusCode,
            nationalityCountryCode: input.nationalityCountryCode,
            personalEmail: input.personalEmail,
            mobilePhone: input.mobilePhone,
            metadata: input.metadata,
          },
        });

        await this.deps.auditService.record({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          action: "hrm.person.created",
          aggregateType: "hrm_person",
          aggregateId: person.id,
          after: {
            personId: person.id,
            personCode: person.personCode,
          },
          meta: {
            correlationId: ctx.correlationId,
            idempotencyKey: ctx.idempotencyKey,
          },
        });

        await this.deps.outboxService.enqueue({
          tx,
          tenantId: ctx.tenantId,
          eventName: "hrm.person.created",
          aggregateType: "hrm_person",
          aggregateId: person.id,
          payload: {
            personId: person.id,
            personCode: person.personCode,
          },
        });

        return ok<CreatePersonOutput>({
          personId: person.id,
          personCode: person.personCode,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create person", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 12) `packages/core/src/erp/hr/core/services/transfer-employee.service.ts`

```ts
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type {
  TransferEmployeeInput,
  TransferEmployeeOutput,
} from "../dto/transfer-employee.dto";
import type { EmploymentRepository } from "../repositories/employment.repository";
import type { WorkAssignmentRepository } from "../repositories/work-assignment.repository";

export interface TransferEmployeeDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  employmentRepository: EmploymentRepository;
  workAssignmentRepository: WorkAssignmentRepository;
  auditService: {
    record: (args: {
      tx?: unknown;
      tenantId: string;
      actorUserId: string;
      action: string;
      aggregateType: string;
      aggregateId: string;
      after: Record<string, unknown>;
      meta?: Record<string, unknown>;
    }) => Promise<void>;
  };
  outboxService: {
    enqueue: (args: {
      tx?: unknown;
      tenantId: string;
      eventName: string;
      aggregateType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>;
  };
}

export class TransferEmployeeService {
  constructor(private readonly deps: TransferEmployeeDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: TransferEmployeeInput,
  ): Promise<HrmResult<TransferEmployeeOutput>> {
    if (!input.employmentId || !input.effectiveFrom || !input.legalEntityId) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employmentId, effectiveFrom, and legalEntityId are required",
      );
    }

    const employment = await this.deps.employmentRepository.findById({
      tenantId: ctx.tenantId,
      employmentId: input.employmentId,
    });

    if (!employment) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    if (!["active", "probation", "suspended"].includes(employment.employmentStatus)) {
      return err(
        HRM_ERROR_CODES.CONFLICT,
        "Employment is not in a transferable state",
        {
          employmentId: input.employmentId,
          employmentStatus: employment.employmentStatus,
        },
      );
    }

    const currentAssignment =
      await this.deps.workAssignmentRepository.findCurrentByEmploymentId({
        tenantId: ctx.tenantId,
        employmentId: input.employmentId,
      });

    if (!currentAssignment) {
      return err(
        HRM_ERROR_CODES.CONFLICT,
        "Current work assignment not found",
        { employmentId: input.employmentId },
      );
    }

    const overlapping =
      await this.deps.workAssignmentRepository.findOverlappingAssignments({
        tenantId: ctx.tenantId,
        employmentId: input.employmentId,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: null,
      });

    const conflictExists = overlapping.some((row) => row.id !== currentAssignment.id);
    if (conflictExists) {
      return err(
        HRM_ERROR_CODES.WORK_ASSIGNMENT_OVERLAP,
        "Transfer would create overlapping work assignments",
        {
          employmentId: input.employmentId,
          effectiveFrom: input.effectiveFrom,
        },
      );
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        await this.deps.workAssignmentRepository.closeCurrentAssignment({
          tx,
          tenantId: ctx.tenantId,
          employmentId: input.employmentId,
          effectiveTo: input.effectiveFrom,
          actorUserId: ctx.actorUserId,
        });

        const newAssignment = await this.deps.workAssignmentRepository.insert({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          employmentId: input.employmentId,
          legalEntityId: input.legalEntityId,
          businessUnitId: input.businessUnitId,
          departmentId: input.departmentId,
          costCenterId: input.costCenterId,
          locationId: input.locationId,
          positionId: input.positionId,
          jobId: input.jobId,
          gradeId: input.gradeId,
          managerEmployeeId: input.managerEmployeeId,
          workScheduleId: input.workScheduleId,
          employmentClass: input.employmentClass,
          fteRatio: input.fteRatio,
          effectiveFrom: input.effectiveFrom,
          changeReason: input.changeReason,
        });

        const payload = {
          employmentId: input.employmentId,
          previousWorkAssignmentId: currentAssignment.id,
          newWorkAssignmentId: newAssignment.id,
          effectiveFrom: input.effectiveFrom,
          legalEntityId: input.legalEntityId,
          businessUnitId: input.businessUnitId,
          departmentId: input.departmentId,
          positionId: input.positionId,
          jobId: input.jobId,
          gradeId: input.gradeId,
          changeReason: input.changeReason,
        };

        await this.deps.auditService.record({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          action: HRM_EVENTS.EMPLOYEE_TRANSFERRED,
          aggregateType: "hrm_employment",
          aggregateId: input.employmentId,
          after: payload,
          meta: {
            correlationId: ctx.correlationId,
            idempotencyKey: ctx.idempotencyKey,
          },
        });

        await this.deps.outboxService.enqueue({
          tx,
          tenantId: ctx.tenantId,
          eventName: HRM_EVENTS.EMPLOYEE_TRANSFERRED,
          aggregateType: "hrm_employment",
          aggregateId: input.employmentId,
          payload,
        });

        return ok<TransferEmployeeOutput>({
          previousWorkAssignmentId: currentAssignment.id,
          newWorkAssignmentId: newAssignment.id,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to transfer employee", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 13) `apps/api/src/routes/erp/hr/create-person.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const createPersonBodySchema = z.object({
  personCode: z.string().min(1).max(50).optional(),
  legalName: z.string().min(1).max(255),
  preferredName: z.string().max(255).optional(),
  firstName: z.string().min(1).max(120),
  middleName: z.string().max(120).optional(),
  lastName: z.string().min(1).max(120),
  displayName: z.string().max(255).optional(),
  birthDate: z.string().optional(),
  genderCode: z.string().max(50).optional(),
  maritalStatusCode: z.string().max(50).optional(),
  nationalityCountryCode: z.string().max(3).optional(),
  personalEmail: z.string().email().optional(),
  mobilePhone: z.string().max(50).optional(),
});

type CreatePersonBody = z.infer<typeof createPersonBodySchema>;

export async function registerCreatePersonRoute(app: FastifyInstance) {
  app.post(
    "/v1/hrm/people",
    {
      schema: {
        tags: ["HRM", "Core HR"],
        summary: "Create person",
      },
    },
    async (
      request: FastifyRequest<{ Body: CreatePersonBody }>,
      reply: FastifyReply,
    ) => {
      const parsed = createPersonBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          ok: false,
          error: {
            code: "HRM_INVALID_INPUT",
            message: "Invalid request body",
            meta: { issues: parsed.error.flatten() },
          },
        });
      }

      const tenantId = request.headers["x-tenant-id"];
      const actorUserId = request.headers["x-actor-user-id"];
      const idempotencyKey = request.headers["idempotency-key"];

      if (
        typeof tenantId !== "string" ||
        typeof actorUserId !== "string" ||
        typeof idempotencyKey !== "string"
      ) {
        return reply.status(401).send({
          ok: false,
          error: {
            code: "HRM_UNAUTHORIZED",
            message: "Missing tenant/auth/idempotency context",
          },
        });
      }

      const service = app.di.resolve("hrm.core.createPersonService");

      const result = await service.execute(
        {
          tenantId,
          actorUserId,
          idempotencyKey,
          correlationId:
            typeof request.headers["x-correlation-id"] === "string"
              ? request.headers["x-correlation-id"]
              : null,
        },
        parsed.data,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_INVALID_INPUT"
            ? 400
            : result.error.code === "HRM_CONFLICT"
              ? 409
              : 500;

        return reply.status(status).send(result);
      }

      return reply.status(201).send(result);
    },
  );
}
```

---

# 14) `apps/api/src/routes/erp/hr/transfer-employee.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const transferEmployeeBodySchema = z.object({
  employmentId: z.string().uuid(),
  effectiveFrom: z.string(),
  legalEntityId: z.string().uuid(),
  businessUnitId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  gradeId: z.string().uuid().optional(),
  managerEmployeeId: z.string().uuid().optional(),
  workScheduleId: z.string().uuid().optional(),
  employmentClass: z.string().max(50).optional(),
  fteRatio: z.string().max(20).optional(),
  changeReason: z.string().min(1).max(120),
});

type TransferEmployeeBody = z.infer<typeof transferEmployeeBodySchema>;

export async function registerTransferEmployeeRoute(app: FastifyInstance) {
  app.post(
    "/v1/hrm/employments/transfer",
    {
      schema: {
        tags: ["HRM", "Core HR"],
        summary: "Transfer employee",
      },
    },
    async (
      request: FastifyRequest<{ Body: TransferEmployeeBody }>,
      reply: FastifyReply,
    ) => {
      const parsed = transferEmployeeBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          ok: false,
          error: {
            code: "HRM_INVALID_INPUT",
            message: "Invalid request body",
            meta: { issues: parsed.error.flatten() },
          },
        });
      }

      const tenantId = request.headers["x-tenant-id"];
      const actorUserId = request.headers["x-actor-user-id"];
      const idempotencyKey = request.headers["idempotency-key"];

      if (
        typeof tenantId !== "string" ||
        typeof actorUserId !== "string" ||
        typeof idempotencyKey !== "string"
      ) {
        return reply.status(401).send({
          ok: false,
          error: {
            code: "HRM_UNAUTHORIZED",
            message: "Missing tenant/auth/idempotency context",
          },
        });
      }

      const service = app.di.resolve("hrm.core.transferEmployeeService");

      const result = await service.execute(
        {
          tenantId,
          actorUserId,
          idempotencyKey,
          correlationId:
            typeof request.headers["x-correlation-id"] === "string"
              ? request.headers["x-correlation-id"]
              : null,
        },
        parsed.data,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_INVALID_INPUT"
            ? 400
            : result.error.code === "HRM_WORK_ASSIGNMENT_OVERLAP" ||
                result.error.code === "HRM_CONFLICT"
              ? 409
              : 500;

        return reply.status(status).send(result);
      }

      return reply.status(200).send(result);
    },
  );
}
```

---

# 15) Next exact batch to build

Now the next correct files are:

```text
packages/core/src/erp/hr/core/services/terminate-employment.service.ts
packages/core/src/erp/hr/core/services/rehire-employee.service.ts
packages/core/src/erp/hr/core/queries/get-employee-profile.query.ts
packages/core/src/erp/hr/core/queries/list-employees.query.ts
apps/api/src/routes/erp/hr/terminate-employment.ts
apps/api/src/routes/erp/hr/list-employees.ts
apps/api/src/routes/erp/hr/get-employee-profile.ts
```

Then after that:

```text
packages/db/src/schema/erp/hrm/hrm-recruitment.ts
packages/db/src/schema/erp/hrm/hrm-onboarding.ts
recruitment services
onboarding services
```

The reason is simple:

**Phase 1 is not complete when you can hire.
Phase 1 is complete when you can hire, move, terminate, rehire, and explain the employment timeline with evidence.**

I can continue with the next drop-in batch:
**terminate + rehire + employee profile queries + API routes**.
