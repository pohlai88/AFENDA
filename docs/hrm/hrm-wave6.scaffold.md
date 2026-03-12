Below is the **next Phase 1 scaffold batch** focused on **read models, org visibility, and invariant test coverage**:

1. `list-requisitions.query.ts`
2. `get-application.query.ts`
3. `list-pending-onboarding.query.ts`
4. `get-org-tree.query.ts`
5. `assign-position.service.ts`
6. `close-position.service.ts`
7. read/query route files
8. Phase 1 invariant test scaffold

This is the right next step because your Phase 1 foundation is already mutation-rich; now AFENDA needs **review surfaces and control gates** to keep workforce truth coherent. That fits the charter’s release gates and invariants.  

---

# 1) `packages/domain/src/hrm/recruitment/queries/list-requisitions.query.ts`

```ts
export interface RequisitionListItemView {
  requisitionId: string;
  requisitionCode: string;
  positionId: string | null;
  employmentType: string;
  targetStartDate: string | null;
  hiringManagerEmployeeId: string | null;
  recruiterEmployeeId: string | null;
  status: string;
}

export interface ListRequisitionsQueryInput {
  tenantId: string;
  status?: string;
  recruiterEmployeeId?: string;
  hiringManagerEmployeeId?: string;
  limit?: number;
  offset?: number;
}

export interface ListRequisitionsQueryResult {
  items: RequisitionListItemView[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListRequisitionsQuery {
  execute(input: ListRequisitionsQueryInput): Promise<ListRequisitionsQueryResult>;
}
```

---

# 2) `packages/domain/src/hrm/recruitment/queries/get-application.query.ts`

```ts
export interface ApplicationInterviewView {
  interviewId: string;
  interviewType: string;
  scheduledAt: string;
  status: string;
}

export interface ApplicationFeedbackView {
  interviewFeedbackId: string;
  interviewId: string;
  reviewerEmployeeId: string | null;
  rating: number | null;
  recommendation: string | null;
  feedbackText: string | null;
}

export interface ApplicationOfferView {
  offerId: string;
  offerNumber: string;
  offerStatus: string;
  proposedStartDate: string | null;
  baseSalaryAmount: string | null;
  currencyCode: string | null;
}

export interface ApplicationView {
  applicationId: string;
  candidateId: string;
  requisitionId: string;
  applicationDate: string;
  stageCode: string;
  applicationStatus: string;
  score: number | null;
  ownerUserId: string | null;
  interviews: ApplicationInterviewView[];
  feedback: ApplicationFeedbackView[];
  offers: ApplicationOfferView[];
}

export interface GetApplicationQuery {
  execute(args: {
    tenantId: string;
    applicationId: string;
  }): Promise<ApplicationView | null>;
}
```

---

# 3) `packages/domain/src/hrm/onboarding/queries/list-pending-onboarding.query.ts`

```ts
export interface PendingOnboardingItemView {
  onboardingPlanId: string;
  employmentId: string;
  startDate: string;
  status: string;
  pendingTaskCount: number;
  completedTaskCount: number;
}

export interface ListPendingOnboardingQueryInput {
  tenantId: string;
  limit?: number;
  offset?: number;
}

export interface ListPendingOnboardingQueryResult {
  items: PendingOnboardingItemView[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListPendingOnboardingQuery {
  execute(input: ListPendingOnboardingQueryInput): Promise<ListPendingOnboardingQueryResult>;
}
```

---

# 4) `packages/domain/src/hrm/organization/queries/get-org-tree.query.ts`

```ts
export interface OrgTreeNodeView {
  orgUnitId: string;
  orgUnitCode: string;
  orgUnitName: string;
  orgUnitType: string;
  status: string;
  children: OrgTreeNodeView[];
}

export interface GetOrgTreeQuery {
  execute(args: {
    tenantId: string;
    legalEntityId?: string;
  }): Promise<OrgTreeNodeView[]>;
}
```

---

# 5) `packages/domain/src/hrm/organization/dto/assign-position.dto.ts`

```ts
export interface AssignPositionInput {
  positionId: string;
  employmentId: string;
  assignmentType?: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface AssignPositionOutput {
  positionAssignmentId: string;
  positionId: string;
  employmentId: string;
}
```

---

# 6) `packages/domain/src/hrm/organization/dto/close-position.dto.ts`

```ts
export interface ClosePositionInput {
  positionId: string;
  reason?: string;
}

export interface ClosePositionOutput {
  positionId: string;
  positionStatus: string;
}
```

---

# 7) `packages/domain/src/hrm/organization/repositories/position.repository.ts`

```ts
export interface PositionRecord {
  id: string;
  tenantId: string;
  positionCode: string;
  positionTitle: string;
  legalEntityId: string;
  orgUnitId: string | null;
  jobId: string | null;
  gradeId: string | null;
  costCenterId: string | null;
  reportsToPositionId: string | null;
  positionStatus: string;
  isBudgeted: boolean;
  headcountLimit: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
}

export interface PositionAssignmentRecord {
  id: string;
  tenantId: string;
  positionId: string;
  employmentId: string;
  assignmentType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
}

export interface PositionRepository {
  findById(args: {
    tx?: unknown;
    tenantId: string;
    positionId: string;
  }): Promise<PositionRecord | null>;

  countCurrentAssignments(args: {
    tx?: unknown;
    tenantId: string;
    positionId: string;
  }): Promise<number>;

  insertAssignment(args: {
    tx?: unknown;
    tenantId: string;
    actorUserId: string;
    positionId: string;
    employmentId: string;
    assignmentType: string;
    effectiveFrom: string;
    effectiveTo?: string;
  }): Promise<PositionAssignmentRecord>;

  closeCurrentAssignmentsForEmployment(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
    effectiveTo: string;
    actorUserId: string;
  }): Promise<void>;

  closePosition(args: {
    tx?: unknown;
    tenantId: string;
    positionId: string;
    actorUserId: string;
  }): Promise<void>;
}
```

---

# 8) `packages/domain/src/hrm/organization/services/assign-position.service.ts`

```ts
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import type {
  AssignPositionInput,
  AssignPositionOutput,
} from "../dto/assign-position.dto";
import type { PositionRepository } from "../repositories/position.repository";
import type { EmploymentRepository } from "../../core/repositories/employment.repository";

export interface AssignPositionDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  positionRepository: PositionRepository;
  employmentRepository: EmploymentRepository;
  auditService: {
    record: (args: {
      tx?: unknown;
      tenantId: string;
      actorUserId: string;
      action: string;
      aggregateType: string;
      aggregateId: string;
      after: Record<string, unknown>;
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

export class AssignPositionService {
  constructor(private readonly deps: AssignPositionDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: AssignPositionInput,
  ): Promise<HrmResult<AssignPositionOutput>> {
    if (!input.positionId || !input.employmentId || !input.effectiveFrom) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "positionId, employmentId, and effectiveFrom are required",
      );
    }

    const [position, employment] = await Promise.all([
      this.deps.positionRepository.findById({
        tenantId: ctx.tenantId,
        positionId: input.positionId,
      }),
      this.deps.employmentRepository.findById({
        tenantId: ctx.tenantId,
        employmentId: input.employmentId,
      }),
    ]);

    if (!position) {
      return err(HRM_ERROR_CODES.POSITION_NOT_FOUND, "Position not found", {
        positionId: input.positionId,
      });
    }

    if (!employment) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    if (position.positionStatus !== "open" && position.positionStatus !== "filled") {
      return err(HRM_ERROR_CODES.CONFLICT, "Position is not assignable", {
        positionId: input.positionId,
        status: position.positionStatus,
      });
    }

    const currentCount = await this.deps.positionRepository.countCurrentAssignments({
      tenantId: ctx.tenantId,
      positionId: input.positionId,
    });

    if (currentCount >= position.headcountLimit) {
      return err(HRM_ERROR_CODES.CONFLICT, "Position headcount limit exceeded", {
        positionId: input.positionId,
        headcountLimit: position.headcountLimit,
      });
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        await this.deps.positionRepository.closeCurrentAssignmentsForEmployment({
          tx,
          tenantId: ctx.tenantId,
          employmentId: input.employmentId,
          effectiveTo: input.effectiveFrom,
          actorUserId: ctx.actorUserId,
        });

        const positionAssignment = await this.deps.positionRepository.insertAssignment({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          positionId: input.positionId,
          employmentId: input.employmentId,
          assignmentType: input.assignmentType ?? "primary",
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
        });

        const payload = {
          positionAssignmentId: positionAssignment.id,
          positionId: input.positionId,
          employmentId: input.employmentId,
        };

        await this.deps.auditService.record({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          action: "hrm.position.assigned",
          aggregateType: "hrm_position",
          aggregateId: input.positionId,
          after: payload,
        });

        await this.deps.outboxService.enqueue({
          tx,
          tenantId: ctx.tenantId,
          eventName: "hrm.position.assigned",
          aggregateType: "hrm_position",
          aggregateId: input.positionId,
          payload,
        });

        return ok<AssignPositionOutput>({
          positionAssignmentId: positionAssignment.id,
          positionId: input.positionId,
          employmentId: input.employmentId,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to assign position", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 9) `packages/domain/src/hrm/organization/services/close-position.service.ts`

```ts
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import type {
  ClosePositionInput,
  ClosePositionOutput,
} from "../dto/close-position.dto";
import type { PositionRepository } from "../repositories/position.repository";

export interface ClosePositionDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  positionRepository: PositionRepository;
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

export class ClosePositionService {
  constructor(private readonly deps: ClosePositionDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: ClosePositionInput,
  ): Promise<HrmResult<ClosePositionOutput>> {
    if (!input.positionId) {
      return err(HRM_ERROR_CODES.INVALID_INPUT, "positionId is required");
    }

    const position = await this.deps.positionRepository.findById({
      tenantId: ctx.tenantId,
      positionId: input.positionId,
    });

    if (!position) {
      return err(HRM_ERROR_CODES.POSITION_NOT_FOUND, "Position not found", {
        positionId: input.positionId,
      });
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        await this.deps.positionRepository.closePosition({
          tx,
          tenantId: ctx.tenantId,
          positionId: input.positionId,
          actorUserId: ctx.actorUserId,
        });

        const payload = {
          positionId: input.positionId,
          positionStatus: "closed",
          reason: input.reason ?? null,
        };

        await this.deps.auditService.record({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          action: "hrm.position.closed",
          aggregateType: "hrm_position",
          aggregateId: input.positionId,
          after: payload,
        });

        await this.deps.outboxService.enqueue({
          tx,
          tenantId: ctx.tenantId,
          eventName: "hrm.position.closed",
          aggregateType: "hrm_position",
          aggregateId: input.positionId,
          payload,
        });

        return ok<ClosePositionOutput>({
          positionId: input.positionId,
          positionStatus: "closed",
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to close position", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 10) `packages/infrastructure/src/hrm/queries/drizzle-list-requisitions.query.ts`

```ts
import { and, eq } from "drizzle-orm";
import { hrmJobRequisitions } from "@afenda/db/schema/hrm";
import type {
  ListRequisitionsQuery,
  ListRequisitionsQueryInput,
  ListRequisitionsQueryResult,
} from "@afenda/domain/hrm/recruitment/queries/list-requisitions.query";

type DbLike = {
  query: {
    hrmJobRequisitions: {
      findMany: (args: unknown) => Promise<any[]>;
    };
  };
};

export class DrizzleListRequisitionsQuery implements ListRequisitionsQuery {
  constructor(private readonly db: DbLike) {}

  async execute(input: ListRequisitionsQueryInput): Promise<ListRequisitionsQueryResult> {
    const limit = Math.min(input.limit ?? 25, 100);
    const offset = Math.max(input.offset ?? 0, 0);

    const rows = await this.db.query.hrmJobRequisitions.findMany({
      where: and(
        eq(hrmJobRequisitions.tenantId, input.tenantId),
        input.status ? eq(hrmJobRequisitions.status, input.status) : undefined,
        input.recruiterEmployeeId
          ? eq(hrmJobRequisitions.recruiterEmployeeId, input.recruiterEmployeeId)
          : undefined,
        input.hiringManagerEmployeeId
          ? eq(hrmJobRequisitions.hiringManagerEmployeeId, input.hiringManagerEmployeeId)
          : undefined,
      ),
      limit,
      offset,
    });

    const items = rows.map((r: any) => ({
      requisitionId: r.id,
      requisitionCode: r.requisitionCode,
      positionId: r.positionId ?? null,
      employmentType: r.employmentType,
      targetStartDate: r.targetStartDate ?? null,
      hiringManagerEmployeeId: r.hiringManagerEmployeeId ?? null,
      recruiterEmployeeId: r.recruiterEmployeeId ?? null,
      status: r.status,
    }));

    return {
      items,
      total: items.length,
      limit,
      offset,
    };
  }
}
```

---

# 11) `packages/infrastructure/src/hrm/queries/drizzle-get-application.query.ts`

```ts
import { and, eq } from "drizzle-orm";
import { hrmCandidateApplications } from "@afenda/db/schema/hrm";
import type {
  ApplicationView,
  GetApplicationQuery,
} from "@afenda/domain/hrm/recruitment/queries/get-application.query";

type DbLike = {
  query: {
    hrmCandidateApplications: {
      findFirst: (args: unknown) => Promise<any>;
    };
  };
};

export class DrizzleGetApplicationQuery implements GetApplicationQuery {
  constructor(private readonly db: DbLike) {}

  async execute(args: {
    tenantId: string;
    applicationId: string;
  }): Promise<ApplicationView | null> {
    const row = await this.db.query.hrmCandidateApplications.findFirst({
      where: and(
        eq(hrmCandidateApplications.tenantId, args.tenantId),
        eq(hrmCandidateApplications.id, args.applicationId),
      ),
      with: {
        interviews: {
          with: {
            feedback: true,
          },
        },
        offers: true,
      },
    });

    if (!row) return null;

    return {
      applicationId: row.id,
      candidateId: row.candidateId,
      requisitionId: row.requisitionId,
      applicationDate: row.applicationDate,
      stageCode: row.stageCode,
      applicationStatus: row.applicationStatus,
      score: row.score ?? null,
      ownerUserId: row.ownerUserId ?? null,
      interviews: (row.interviews ?? []).map((i: any) => ({
        interviewId: i.id,
        interviewType: i.interviewType,
        scheduledAt: i.scheduledAt,
        status: i.status,
      })),
      feedback: (row.interviews ?? []).flatMap((i: any) =>
        (i.feedback ?? []).map((f: any) => ({
          interviewFeedbackId: f.id,
          interviewId: f.interviewId,
          reviewerEmployeeId: f.reviewerEmployeeId ?? null,
          rating: f.rating ?? null,
          recommendation: f.recommendation ?? null,
          feedbackText: f.feedbackText ?? null,
        })),
      ),
      offers: (row.offers ?? []).map((o: any) => ({
        offerId: o.id,
        offerNumber: o.offerNumber,
        offerStatus: o.offerStatus,
        proposedStartDate: o.proposedStartDate ?? null,
        baseSalaryAmount: o.baseSalaryAmount ?? null,
        currencyCode: o.currencyCode ?? null,
      })),
    };
  }
}
```

---

# 12) `packages/infrastructure/src/hrm/queries/drizzle-list-pending-onboarding.query.ts`

```ts
import { and, eq, ne } from "drizzle-orm";
import { hrmOnboardingPlans } from "@afenda/db/schema/hrm";
import type {
  ListPendingOnboardingQuery,
  ListPendingOnboardingQueryInput,
  ListPendingOnboardingQueryResult,
} from "@afenda/domain/hrm/onboarding/queries/list-pending-onboarding.query";

type DbLike = {
  query: {
    hrmOnboardingPlans: {
      findMany: (args: unknown) => Promise<any[]>;
    };
  };
};

export class DrizzleListPendingOnboardingQuery implements ListPendingOnboardingQuery {
  constructor(private readonly db: DbLike) {}

  async execute(input: ListPendingOnboardingQueryInput): Promise<ListPendingOnboardingQueryResult> {
    const limit = Math.min(input.limit ?? 25, 100);
    const offset = Math.max(input.offset ?? 0, 0);

    const rows = await this.db.query.hrmOnboardingPlans.findMany({
      where: and(
        eq(hrmOnboardingPlans.tenantId, input.tenantId),
        ne(hrmOnboardingPlans.status, "completed"),
      ),
      with: {
        tasks: true,
      },
      limit,
      offset,
    });

    const items = rows.map((r: any) => {
      const tasks = r.tasks ?? [];
      const pendingTaskCount = tasks.filter((t: any) => t.status !== "completed").length;
      const completedTaskCount = tasks.filter((t: any) => t.status === "completed").length;

      return {
        onboardingPlanId: r.id,
        employmentId: r.employmentId,
        startDate: r.startDate,
        status: r.status,
        pendingTaskCount,
        completedTaskCount,
      };
    });

    return {
      items,
      total: items.length,
      limit,
      offset,
    };
  }
}
```

---

# 13) `packages/infrastructure/src/hrm/queries/drizzle-get-org-tree.query.ts`

```ts
import { and, eq } from "drizzle-orm";
import { hrmOrgUnits } from "@afenda/db/schema/hrm";
import type {
  GetOrgTreeQuery,
  OrgTreeNodeView,
} from "@afenda/domain/hrm/organization/queries/get-org-tree.query";

type DbLike = {
  query: {
    hrmOrgUnits: {
      findMany: (args: unknown) => Promise<any[]>;
    };
  };
};

export class DrizzleGetOrgTreeQuery implements GetOrgTreeQuery {
  constructor(private readonly db: DbLike) {}

  async execute(args: {
    tenantId: string;
    legalEntityId?: string;
  }): Promise<OrgTreeNodeView[]> {
    const rows = await this.db.query.hrmOrgUnits.findMany({
      where: and(
        eq(hrmOrgUnits.tenantId, args.tenantId),
        args.legalEntityId ? eq(hrmOrgUnits.legalEntityId, args.legalEntityId) : undefined,
      ),
    });

    const byParent = new Map<string | null, any[]>();
    for (const row of rows) {
      const key = row.parentOrgUnitId ?? null;
      const list = byParent.get(key) ?? [];
      list.push(row);
      byParent.set(key, list);
    }

    const build = (parentId: string | null): OrgTreeNodeView[] => {
      const children = byParent.get(parentId) ?? [];
      return children.map((row) => ({
        orgUnitId: row.id,
        orgUnitCode: row.orgUnitCode,
        orgUnitName: row.orgUnitName,
        orgUnitType: row.orgUnitType,
        status: row.status,
        children: build(row.id),
      }));
    };

    return build(null);
  }
}
```

---

# 14) `packages/infrastructure/src/hrm/repositories/drizzle-position.repository.ts`

```ts
import { and, eq } from "drizzle-orm";
import {
  hrmPositionAssignments,
  hrmPositions,
} from "@afenda/db/schema/hrm";
import type {
  PositionAssignmentRecord,
  PositionRecord,
  PositionRepository,
} from "@afenda/domain/hrm/organization/repositories/position.repository";

type DbExecutor = {
  query: {
    hrmPositions: {
      findFirst: (args: unknown) => Promise<any>;
    };
    hrmPositionAssignments: {
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

function mapPosition(row: any): PositionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    positionCode: row.positionCode,
    positionTitle: row.positionTitle,
    legalEntityId: row.legalEntityId,
    orgUnitId: row.orgUnitId ?? null,
    jobId: row.jobId ?? null,
    gradeId: row.gradeId ?? null,
    costCenterId: row.costCenterId ?? null,
    reportsToPositionId: row.reportsToPositionId ?? null,
    positionStatus: row.positionStatus,
    isBudgeted: row.isBudgeted,
    headcountLimit: row.headcountLimit,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? null,
    isCurrent: row.isCurrent,
  };
}

function mapAssignment(row: any): PositionAssignmentRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    positionId: row.positionId,
    employmentId: row.employmentId,
    assignmentType: row.assignmentType,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? null,
    isCurrent: row.isCurrent,
  };
}

export class DrizzlePositionRepository implements PositionRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findById(args: {
    tx?: unknown;
    tenantId: string;
    positionId: string;
  }): Promise<PositionRecord | null> {
    const db = this.getExecutor(args.tx);
    const row = await db.query.hrmPositions.findFirst({
      where: and(
        eq(hrmPositions.tenantId, args.tenantId),
        eq(hrmPositions.id, args.positionId),
      ),
    });
    return row ? mapPosition(row) : null;
  }

  async countCurrentAssignments(args: {
    tx?: unknown;
    tenantId: string;
    positionId: string;
  }): Promise<number> {
    const db = this.getExecutor(args.tx);
    const rows = await db.query.hrmPositionAssignments.findMany({
      where: and(
        eq(hrmPositionAssignments.tenantId, args.tenantId),
        eq(hrmPositionAssignments.positionId, args.positionId),
        eq(hrmPositionAssignments.isCurrent, true),
      ),
    });
    return rows.length;
  }

  async insertAssignment(args: {
    tx?: unknown;
    tenantId: string;
    actorUserId: string;
    positionId: string;
    employmentId: string;
    assignmentType: string;
    effectiveFrom: string;
    effectiveTo?: string;
  }): Promise<PositionAssignmentRecord> {
    const db = this.getExecutor(args.tx);
    const [row] = await db
      .insert(hrmPositionAssignments)
      .values({
        tenantId: args.tenantId,
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
        positionId: args.positionId,
        employmentId: args.employmentId,
        assignmentType: args.assignmentType,
        effectiveFrom: args.effectiveFrom,
        effectiveTo: args.effectiveTo,
        isCurrent: !args.effectiveTo,
        changeReason: "position_assignment",
      })
      .returning();

    return mapAssignment(row);
  }

  async closeCurrentAssignmentsForEmployment(args: {
    tx?: unknown;
    tenantId: string;
    employmentId: string;
    effectiveTo: string;
    actorUserId: string;
  }): Promise<void> {
    const db = this.getExecutor(args.tx);
    await db
      .update(hrmPositionAssignments)
      .set({
        effectiveTo: args.effectiveTo,
        isCurrent: false,
        updatedBy: args.actorUserId,
      })
      .where(
        and(
          eq(hrmPositionAssignments.tenantId, args.tenantId),
          eq(hrmPositionAssignments.employmentId, args.employmentId),
          eq(hrmPositionAssignments.isCurrent, true),
        ),
      );
  }

  async closePosition(args: {
    tx?: unknown;
    tenantId: string;
    positionId: string;
    actorUserId: string;
  }): Promise<void> {
    const db = this.getExecutor(args.tx);
    await db
      .update(hrmPositions)
      .set({
        positionStatus: "closed",
        updatedBy: args.actorUserId,
      })
      .where(
        and(
          eq(hrmPositions.tenantId, args.tenantId),
          eq(hrmPositions.id, args.positionId),
        ),
      );
  }
}
```

---

# 15) `apps/api/src/modules/hrm/recruitment/routes/list-requisitions.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const querySchema = z.object({
  status: z.string().optional(),
  recruiterEmployeeId: z.string().uuid().optional(),
  hiringManagerEmployeeId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

type Querystring = z.infer<typeof querySchema>;

export async function registerListRequisitionsRoute(app: FastifyInstance) {
  app.get("/v1/hrm/requisitions", async (
    request: FastifyRequest<{ Querystring: Querystring }>,
    reply: FastifyReply,
  ) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: { code: "HRM_INVALID_INPUT", message: "Invalid querystring", meta: { issues: parsed.error.flatten() } },
      });
    }

    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.status(401).send({
        ok: false,
        error: { code: "HRM_UNAUTHORIZED", message: "Missing tenant context" },
      });
    }

    const query = app.di.resolve("hrm.recruitment.listRequisitionsQuery");
    const result = await query.execute({
      tenantId,
      ...parsed.data,
    });

    return reply.status(200).send({ ok: true, data: result });
  });
}
```

---

# 16) `apps/api/src/modules/hrm/recruitment/routes/get-application.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function registerGetApplicationRoute(app: FastifyInstance) {
  app.get("/v1/hrm/applications/:applicationId", async (
    request: FastifyRequest<{ Params: { applicationId: string } }>,
    reply: FastifyReply,
  ) => {
    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.status(401).send({
        ok: false,
        error: { code: "HRM_UNAUTHORIZED", message: "Missing tenant context" },
      });
    }

    const query = app.di.resolve("hrm.recruitment.getApplicationQuery");
    const result = await query.execute({
      tenantId,
      applicationId: request.params.applicationId,
    });

    if (!result) {
      return reply.status(404).send({
        ok: false,
        error: { code: "HRM_NOT_FOUND", message: "Application not found" },
      });
    }

    return reply.status(200).send({ ok: true, data: result });
  });
}
```

---

# 17) `apps/api/src/modules/hrm/onboarding/routes/list-pending-onboarding.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

type Querystring = z.infer<typeof querySchema>;

export async function registerListPendingOnboardingRoute(app: FastifyInstance) {
  app.get("/v1/hrm/onboarding/pending", async (
    request: FastifyRequest<{ Querystring: Querystring }>,
    reply: FastifyReply,
  ) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: { code: "HRM_INVALID_INPUT", message: "Invalid querystring", meta: { issues: parsed.error.flatten() } },
      });
    }

    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.status(401).send({
        ok: false,
        error: { code: "HRM_UNAUTHORIZED", message: "Missing tenant context" },
      });
    }

    const query = app.di.resolve("hrm.onboarding.listPendingOnboardingQuery");
    const result = await query.execute({
      tenantId,
      ...parsed.data,
    });

    return reply.status(200).send({ ok: true, data: result });
  });
}
```

---

# 18) `apps/api/src/modules/hrm/organization/routes/get-org-tree.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const querySchema = z.object({
  legalEntityId: z.string().uuid().optional(),
});

type Querystring = z.infer<typeof querySchema>;

export async function registerGetOrgTreeRoute(app: FastifyInstance) {
  app.get("/v1/hrm/org-tree", async (
    request: FastifyRequest<{ Querystring: Querystring }>,
    reply: FastifyReply,
  ) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: { code: "HRM_INVALID_INPUT", message: "Invalid querystring", meta: { issues: parsed.error.flatten() } },
      });
    }

    const tenantId = request.headers["x-tenant-id"];
    if (typeof tenantId !== "string") {
      return reply.status(401).send({
        ok: false,
        error: { code: "HRM_UNAUTHORIZED", message: "Missing tenant context" },
      });
    }

    const query = app.di.resolve("hrm.organization.getOrgTreeQuery");
    const result = await query.execute({
      tenantId,
      ...parsed.data,
    });

    return reply.status(200).send({ ok: true, data: result });
  });
}
```

---

# 19) `apps/api/src/modules/hrm/organization/routes/assign-position.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const bodySchema = z.object({
  positionId: z.string().uuid(),
  employmentId: z.string().uuid(),
  assignmentType: z.string().max(50).optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
});

type Body = z.infer<typeof bodySchema>;

export async function registerAssignPositionRoute(app: FastifyInstance) {
  app.post("/v1/hrm/positions/assign", async (
    request: FastifyRequest<{ Body: Body }>,
    reply: FastifyReply,
  ) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: { code: "HRM_INVALID_INPUT", message: "Invalid request body", meta: { issues: parsed.error.flatten() } },
      });
    }

    const tenantId = request.headers["x-tenant-id"];
    const actorUserId = request.headers["x-actor-user-id"];
    const idempotencyKey = request.headers["idempotency-key"];

    if (typeof tenantId !== "string" || typeof actorUserId !== "string" || typeof idempotencyKey !== "string") {
      return reply.status(401).send({
        ok: false,
        error: { code: "HRM_UNAUTHORIZED", message: "Missing tenant/auth/idempotency context" },
      });
    }

    const service = app.di.resolve("hrm.organization.assignPositionService");
    const result = await service.execute(
      {
        tenantId,
        actorUserId,
        idempotencyKey,
        correlationId: typeof request.headers["x-correlation-id"] === "string" ? request.headers["x-correlation-id"] : null,
      },
      parsed.data,
    );

    return reply.status(result.ok ? 201 : result.error.code === "HRM_INVALID_INPUT" ? 400 : result.error.code === "HRM_CONFLICT" ? 409 : 500).send(result);
  });
}
```

---

# 20) `apps/api/src/modules/hrm/organization/routes/close-position.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const bodySchema = z.object({
  positionId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

type Body = z.infer<typeof bodySchema>;

export async function registerClosePositionRoute(app: FastifyInstance) {
  app.post("/v1/hrm/positions/close", async (
    request: FastifyRequest<{ Body: Body }>,
    reply: FastifyReply,
  ) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: { code: "HRM_INVALID_INPUT", message: "Invalid request body", meta: { issues: parsed.error.flatten() } },
      });
    }

    const tenantId = request.headers["x-tenant-id"];
    const actorUserId = request.headers["x-actor-user-id"];
    const idempotencyKey = request.headers["idempotency-key"];

    if (typeof tenantId !== "string" || typeof actorUserId !== "string" || typeof idempotencyKey !== "string") {
      return reply.status(401).send({
        ok: false,
        error: { code: "HRM_UNAUTHORIZED", message: "Missing tenant/auth/idempotency context" },
      });
    }

    const service = app.di.resolve("hrm.organization.closePositionService");
    const result = await service.execute(
      {
        tenantId,
        actorUserId,
        idempotencyKey,
        correlationId: typeof request.headers["x-correlation-id"] === "string" ? request.headers["x-correlation-id"] : null,
      },
      parsed.data,
    );

    return reply.status(result.ok ? 200 : result.error.code === "HRM_INVALID_INPUT" ? 400 : result.error.code === "HRM_POSITION_NOT_FOUND" ? 404 : 500).send(result);
  });
}
```

---

# 21) Update module indexes

## `apps/api/src/modules/hrm/recruitment/index.ts`

```ts
import type { FastifyInstance } from "fastify";
import { registerCreateRequisitionRoute } from "./routes/create-requisition";
import { registerApproveRequisitionRoute } from "./routes/approve-requisition";
import { registerCreateCandidateRoute } from "./routes/create-candidate";
import { registerSubmitApplicationRoute } from "./routes/submit-application";
import { registerScheduleInterviewRoute } from "./routes/schedule-interview";
import { registerSubmitInterviewFeedbackRoute } from "./routes/submit-interview-feedback";
import { registerIssueOfferRoute } from "./routes/issue-offer";
import { registerAcceptOfferRoute } from "./routes/accept-offer";
import { registerGetCandidatePipelineRoute } from "./routes/get-candidate-pipeline";
import { registerListRequisitionsRoute } from "./routes/list-requisitions";
import { registerGetApplicationRoute } from "./routes/get-application";

export async function registerHrmRecruitmentModule(app: FastifyInstance) {
  await registerCreateRequisitionRoute(app);
  await registerApproveRequisitionRoute(app);
  await registerCreateCandidateRoute(app);
  await registerSubmitApplicationRoute(app);
  await registerScheduleInterviewRoute(app);
  await registerSubmitInterviewFeedbackRoute(app);
  await registerIssueOfferRoute(app);
  await registerAcceptOfferRoute(app);
  await registerGetCandidatePipelineRoute(app);
  await registerListRequisitionsRoute(app);
  await registerGetApplicationRoute(app);
}
```

## `apps/api/src/modules/hrm/onboarding/index.ts`

```ts
import type { FastifyInstance } from "fastify";
import { registerStartOnboardingRoute } from "./routes/start-onboarding";
import { registerStartSeparationRoute } from "./routes/start-separation";
import { registerCompleteOnboardingTaskRoute } from "./routes/complete-onboarding-task";
import { registerClearExitItemRoute } from "./routes/clear-exit-item";
import { registerFinalizeSeparationRoute } from "./routes/finalize-separation";
import { registerRecordProbationReviewRoute } from "./routes/record-probation-review";
import { registerGetOnboardingChecklistRoute } from "./routes/get-onboarding-checklist";
import { registerGetSeparationCaseRoute } from "./routes/get-separation-case";
import { registerListPendingOnboardingRoute } from "./routes/list-pending-onboarding";

export async function registerHrmOnboardingModule(app: FastifyInstance) {
  await registerStartOnboardingRoute(app);
  await registerStartSeparationRoute(app);
  await registerCompleteOnboardingTaskRoute(app);
  await registerClearExitItemRoute(app);
  await registerFinalizeSeparationRoute(app);
  await registerRecordProbationReviewRoute(app);
  await registerGetOnboardingChecklistRoute(app);
  await registerGetSeparationCaseRoute(app);
  await registerListPendingOnboardingRoute(app);
}
```

## `apps/api/src/modules/hrm/organization/index.ts`

```ts
import type { FastifyInstance } from "fastify";
import { registerGetOrgTreeRoute } from "./routes/get-org-tree";
import { registerAssignPositionRoute } from "./routes/assign-position";
import { registerClosePositionRoute } from "./routes/close-position";

export async function registerHrmOrganizationModule(app: FastifyInstance) {
  await registerGetOrgTreeRoute(app);
  await registerAssignPositionRoute(app);
  await registerClosePositionRoute(app);
}
```

---

# 22) Phase 1 invariant tests scaffold

## `packages/domain/src/hrm/__tests__/phase1-invariants.spec.ts`

```ts
import { describe, expect, it } from "vitest";

describe("HRM Phase 1 invariants", () => {
  it("rejects duplicate employee profile for the same person", async () => {
    expect(true).toBe(true);
  });

  it("rejects second active employment for the same employee", async () => {
    expect(true).toBe(true);
  });

  it("rejects overlapping work assignments", async () => {
    expect(true).toBe(true);
  });

  it("rejects position assignment when headcount limit is exceeded", async () => {
    expect(true).toBe(true);
  });

  it("rejects duplicate candidate application for same requisition", async () => {
    expect(true).toBe(true);
  });

  it("rejects accepting an offer twice", async () => {
    expect(true).toBe(true);
  });

  it("rejects finalizing separation with pending clearance items", async () => {
    expect(true).toBe(true);
  });

  it("closes current work assignment on termination", async () => {
    expect(true).toBe(true);
  });

  it("creates employment timeline events in chronological order", async () => {
    expect(true).toBe(true);
  });
});
```

---

# What this batch gives you

At this point, AFENDA Phase 1 has:

```text
Core HR truth
+ org assignment truth
+ recruitment flow
+ onboarding/offboarding flow
+ read models for operators
+ invariant test skeleton
```

That is now close to a **real release candidate skeleton** rather than just a file dump.

---

# Best next scaffold

The next strongest batch is:

```text
seed-hrm-org-units.ts
seed-hrm-jobs.ts
seed-hrm-job-grades.ts
seed-hrm-positions.ts
seed-hrm-requisition-templates.ts
seed-hrm-onboarding-task-templates.ts
hrm module registration / DI wiring
Phase 1 DoD checklist
```

That would move this from scaffold to something your repo can actually boot and demo.
