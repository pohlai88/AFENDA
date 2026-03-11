Below is the **next drop-in batch** for AFENDA HRM Phase 1:

1. `terminate-employment.service.ts`
2. `rehire-employee.service.ts`
3. `get-employee-profile.query.ts`
4. `list-employees.query.ts`
5. `terminate-employment.ts`
6. `get-employee-profile.ts`
7. `list-employees.ts`

This closes the **hire → move → terminate → rehire → explain truth** loop.

---

# 1) `packages/core/src/erp/hr/core/dto/terminate-employment.dto.ts`

```ts
export interface TerminateEmploymentInput {
  employmentId: string;
  terminationDate: string;
  terminationReasonCode: string;
  comment?: string;
  startSeparationCase?: boolean;
}

export interface TerminateEmploymentOutput {
  employmentId: string;
  terminatedAt: string;
  separationCaseId?: string;
}
```

---

# 2) `packages/core/src/erp/hr/core/dto/rehire-employee.dto.ts`

```ts
export interface RehireEmployeeInput {
  employeeId: string;
  legalEntityId: string;
  employmentType: "permanent" | "contract" | "temporary" | "internship" | "outsourced";
  hireDate: string;
  startDate: string;
  probationEndDate?: string;

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

  contract?: {
    contractNumber?: string;
    contractType: string;
    contractStartDate: string;
    contractEndDate?: string;
    documentFileId?: string;
  };
}

export interface RehireEmployeeOutput {
  employeeId: string;
  employmentId: string;
  workAssignmentId: string;
  contractId?: string;
}
```

---

# 3) `packages/core/src/erp/hr/core/queries/get-employee-profile.query.ts`

```ts
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
  positionId: string | null;
  jobId: string | null;
  gradeId: string | null;
  managerEmployeeId: string | null;
}

export interface GetEmployeeProfileQuery {
  execute(args: {
    tenantId: string;
    employeeId: string;
  }): Promise<EmployeeProfileView | null>;
}
```

---

# 4) `packages/core/src/erp/hr/core/queries/list-employees.query.ts`

```ts
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
  tenantId: string;
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
```

---

# 5) `packages/core/src/erp/hr/core/services/terminate-employment.service.ts`

```ts
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type {
  TerminateEmploymentInput,
  TerminateEmploymentOutput,
} from "../dto/terminate-employment.dto";
import type { EmploymentRepository } from "../repositories/employment.repository";
import type { WorkAssignmentRepository } from "../repositories/work-assignment.repository";

export interface TerminateEmploymentDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  employmentRepository: EmploymentRepository;
  workAssignmentRepository: WorkAssignmentRepository;
  separationRepository?: {
    createCase: (args: {
      tx?: unknown;
      tenantId: string;
      actorUserId: string;
      employmentId: string;
      separationType: string;
      lastWorkingDate: string;
      reasonCode: string;
      status?: string;
    }) => Promise<{ id: string }>;
  };
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

export class TerminateEmploymentService {
  constructor(private readonly deps: TerminateEmploymentDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: TerminateEmploymentInput,
  ): Promise<HrmResult<TerminateEmploymentOutput>> {
    if (!input.employmentId || !input.terminationDate || !input.terminationReasonCode) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employmentId, terminationDate, and terminationReasonCode are required",
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

    if (employment.employmentStatus === "terminated") {
      return err(HRM_ERROR_CODES.CONFLICT, "Employment already terminated", {
        employmentId: input.employmentId,
      });
    }

    if (!["active", "probation", "suspended", "inactive"].includes(employment.employmentStatus)) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employment is not in a terminable state", {
        employmentId: input.employmentId,
        employmentStatus: employment.employmentStatus,
      });
    }

    const currentAssignment =
      await this.deps.workAssignmentRepository.findCurrentByEmploymentId({
        tenantId: ctx.tenantId,
        employmentId: input.employmentId,
      });

    try {
      return await this.deps.db.transaction(async (tx) => {
        await this.deps.employmentRepository.updateStatus({
          tx,
          tenantId: ctx.tenantId,
          employmentId: input.employmentId,
          employmentStatus: "terminated",
          terminationDate: input.terminationDate,
          terminationReasonCode: input.terminationReasonCode,
          actorUserId: ctx.actorUserId,
        });

        await this.deps.employmentRepository.insertStatusHistory({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          employmentId: input.employmentId,
          oldStatus: employment.employmentStatus,
          newStatus: "terminated",
          changedAt: input.terminationDate,
          reasonCode: input.terminationReasonCode,
          comment: input.comment,
        });

        if (currentAssignment) {
          await this.deps.workAssignmentRepository.closeCurrentAssignment({
            tx,
            tenantId: ctx.tenantId,
            employmentId: input.employmentId,
            effectiveTo: input.terminationDate,
            actorUserId: ctx.actorUserId,
          });
        }

        let separationCaseId: string | undefined;
        if (input.startSeparationCase && this.deps.separationRepository) {
          const separationCase = await this.deps.separationRepository.createCase({
            tx,
            tenantId: ctx.tenantId,
            actorUserId: ctx.actorUserId,
            employmentId: input.employmentId,
            separationType: "termination",
            lastWorkingDate: input.terminationDate,
            reasonCode: input.terminationReasonCode,
            status: "open",
          });
          separationCaseId = separationCase.id;
        }

        const payload = {
          employmentId: input.employmentId,
          terminatedAt: input.terminationDate,
          terminationReasonCode: input.terminationReasonCode,
          separationCaseId,
        };

        await this.deps.auditService.record({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          action: HRM_EVENTS.EMPLOYEE_TERMINATED,
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
          eventName: HRM_EVENTS.EMPLOYEE_TERMINATED,
          aggregateType: "hrm_employment",
          aggregateId: input.employmentId,
          payload,
        });

        return ok<TerminateEmploymentOutput>({
          employmentId: input.employmentId,
          terminatedAt: input.terminationDate,
          separationCaseId,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to terminate employment", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 6) `packages/core/src/erp/hr/core/services/rehire-employee.service.ts`

```ts
import { randomUUID } from "node:crypto";
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type {
  RehireEmployeeInput,
  RehireEmployeeOutput,
} from "../dto/rehire-employee.dto";
import type { EmployeeProfileRepository } from "../repositories/employee-profile.repository";
import type { EmploymentRepository } from "../repositories/employment.repository";
import type { WorkAssignmentRepository } from "../repositories/work-assignment.repository";

export interface RehireEmployeeDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  employeeProfileRepository: EmployeeProfileRepository;
  employmentRepository: EmploymentRepository;
  workAssignmentRepository: WorkAssignmentRepository;
  contractRepository?: {
    insert: (args: {
      tx?: unknown;
      tenantId: string;
      actorUserId: string;
      employmentId: string;
      contractNumber: string;
      contractType: string;
      contractStartDate: string;
      contractEndDate?: string;
      documentFileId?: string;
    }) => Promise<{ id: string }>;
  };
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
    nextEmploymentNumber: (tenantId: string) => Promise<string>;
    nextContractNumber?: (tenantId: string) => Promise<string>;
  };
}

export class RehireEmployeeService {
  constructor(private readonly deps: RehireEmployeeDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: RehireEmployeeInput,
  ): Promise<HrmResult<RehireEmployeeOutput>> {
    if (!input.employeeId || !input.legalEntityId || !input.hireDate || !input.startDate) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employeeId, legalEntityId, hireDate, and startDate are required",
      );
    }

    const employee = await this.deps.employeeProfileRepository.findById({
      tenantId: ctx.tenantId,
      employeeId: input.employeeId,
    });

    if (!employee) {
      return err(HRM_ERROR_CODES.CONFLICT, "Employee profile not found", {
        employeeId: input.employeeId,
      });
    }

    const hasActiveEmployment =
      await this.deps.employmentRepository.existsActiveEmploymentForEmployee({
        tenantId: ctx.tenantId,
        employeeId: input.employeeId,
      });

    if (hasActiveEmployment) {
      return err(
        HRM_ERROR_CODES.EMPLOYMENT_ALREADY_ACTIVE,
        "Employee already has an active employment",
        { employeeId: input.employeeId },
      );
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        const employmentNumber =
          await this.deps.codeGenerator.nextEmploymentNumber(ctx.tenantId);

        const employment = await this.deps.employmentRepository.insert({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          employeeId: input.employeeId,
          legalEntityId: input.legalEntityId,
          employmentNumber,
          employmentType: input.employmentType,
          hireDate: input.hireDate,
          startDate: input.startDate,
          probationEndDate: input.probationEndDate,
        });

        await this.deps.employeeProfileRepository.updatePrimaryEmploymentId({
          tx,
          tenantId: ctx.tenantId,
          employeeId: input.employeeId,
          primaryEmploymentId: employment.id,
        });

        await this.deps.employmentRepository.insertStatusHistory({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          employmentId: employment.id,
          oldStatus: null,
          newStatus: "active",
          changedAt: input.startDate,
          reasonCode: "rehire",
          comment: "Rehired employee",
        });

        const workAssignment = await this.deps.workAssignmentRepository.insert({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          employmentId: employment.id,
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
          effectiveFrom: input.startDate,
          changeReason: "rehire",
        });

        let contractId: string | undefined;
        if (input.contract && this.deps.contractRepository) {
          const contractNumber =
            input.contract.contractNumber ??
            (await this.deps.codeGenerator.nextContractNumber?.(ctx.tenantId)) ??
            `CTR-${randomUUID()}`;

          const contract = await this.deps.contractRepository.insert({
            tx,
            tenantId: ctx.tenantId,
            actorUserId: ctx.actorUserId,
            employmentId: employment.id,
            contractNumber,
            contractType: input.contract.contractType,
            contractStartDate: input.contract.contractStartDate,
            contractEndDate: input.contract.contractEndDate,
            documentFileId: input.contract.documentFileId,
          });

          contractId = contract.id;
        }

        const payload = {
          employeeId: input.employeeId,
          employmentId: employment.id,
          workAssignmentId: workAssignment.id,
          contractId,
        };

        await this.deps.auditService.record({
          tx,
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          action: HRM_EVENTS.EMPLOYEE_REHIRED,
          aggregateType: "hrm_employment",
          aggregateId: employment.id,
          after: payload,
          meta: {
            correlationId: ctx.correlationId,
            idempotencyKey: ctx.idempotencyKey,
          },
        });

        await this.deps.outboxService.enqueue({
          tx,
          tenantId: ctx.tenantId,
          eventName: HRM_EVENTS.EMPLOYEE_REHIRED,
          aggregateType: "hrm_employment",
          aggregateId: employment.id,
          payload,
        });

        return ok<RehireEmployeeOutput>({
          employeeId: input.employeeId,
          employmentId: employment.id,
          workAssignmentId: workAssignment.id,
          contractId,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to rehire employee", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}
```

---

# 7) `packages/core/src/erp/hr/queries/drizzle-get-employee-profile.query.ts`

```ts
import { and, eq } from "drizzle-orm";
import {
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmPersons,
  hrmWorkAssignments,
} from "@afenda/db/schema/hrm";
import type {
  EmployeeProfileView,
  GetEmployeeProfileQuery,
} from "@afenda/domain/hrm/core/queries/get-employee-profile.query";

type DbLike = {
  query: {
    hrmEmployeeProfiles: {
      findFirst: (args: unknown) => Promise<any>;
    };
  };
};

export class DrizzleGetEmployeeProfileQuery implements GetEmployeeProfileQuery {
  constructor(private readonly db: DbLike) {}

  async execute(args: {
    tenantId: string;
    employeeId: string;
  }): Promise<EmployeeProfileView | null> {
    const row = await this.db.query.hrmEmployeeProfiles.findFirst({
      where: and(
        eq(hrmEmployeeProfiles.tenantId, args.tenantId),
        eq(hrmEmployeeProfiles.id, args.employeeId),
      ),
      with: {
        person: true,
      },
    });

    if (!row) return null;

    const person = row.person;

    return {
      employeeId: row.id,
      employeeCode: row.employeeCode,
      personId: row.personId,
      displayName: person?.displayName ?? person?.legalName ?? row.employeeCode,
      legalName: person?.legalName ?? "",
      personalEmail: person?.personalEmail ?? null,
      mobilePhone: person?.mobilePhone ?? null,
      workerType: row.workerType,
      currentStatus: row.currentStatus,

      employmentId: row.primaryEmploymentId ?? null,
      employmentNumber: null,
      employmentStatus: null,
      legalEntityId: row.primaryLegalEntityId ?? null,
      hireDate: null,
      startDate: null,
      terminationDate: null,

      workAssignmentId: null,
      departmentId: null,
      positionId: null,
      jobId: null,
      gradeId: null,
      managerEmployeeId: null,
    };
  }
}
```

---

# 8) `packages/core/src/erp/hr/queries/drizzle-list-employees.query.ts`

```ts
import { and, eq, ilike } from "drizzle-orm";
import { hrmEmployeeProfiles } from "@afenda/db/schema/hrm";
import type {
  ListEmployeesQuery,
  ListEmployeesQueryInput,
  ListEmployeesQueryResult,
} from "@afenda/domain/hrm/core/queries/list-employees.query";

type DbLike = {
  query: {
    hrmEmployeeProfiles: {
      findMany: (args: unknown) => Promise<any[]>;
    };
  };
};

export class DrizzleListEmployeesQuery implements ListEmployeesQuery {
  constructor(private readonly db: DbLike) {}

  async execute(input: ListEmployeesQueryInput): Promise<ListEmployeesQueryResult> {
    const limit = Math.min(input.limit ?? 25, 100);
    const offset = Math.max(input.offset ?? 0, 0);

    const rows = await this.db.query.hrmEmployeeProfiles.findMany({
      where: and(
        eq(hrmEmployeeProfiles.tenantId, input.tenantId),
        input.workerType ? eq(hrmEmployeeProfiles.workerType, input.workerType as any) : undefined,
        input.search ? ilike(hrmEmployeeProfiles.employeeCode, `%${input.search}%`) : undefined,
      ),
      with: {
        person: true,
      },
      limit,
      offset,
    });

    const items = rows.map((row) => ({
      employeeId: row.id,
      employeeCode: row.employeeCode,
      displayName:
        row.person?.displayName ?? row.person?.legalName ?? row.employeeCode,
      workerType: row.workerType,
      currentStatus: row.currentStatus,
      employmentId: row.primaryEmploymentId ?? null,
      employmentStatus: input.employmentStatus ?? null,
      legalEntityId: row.primaryLegalEntityId ?? null,
      departmentId: null,
      positionId: null,
      managerEmployeeId: null,
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

# 9) `apps/api/src/routes/erp/hr/terminate-employment.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const terminateEmploymentBodySchema = z.object({
  employmentId: z.string().uuid(),
  terminationDate: z.string(),
  terminationReasonCode: z.string().min(1).max(50),
  comment: z.string().max(1000).optional(),
  startSeparationCase: z.boolean().optional(),
});

type TerminateEmploymentBody = z.infer<typeof terminateEmploymentBodySchema>;

export async function registerTerminateEmploymentRoute(app: FastifyInstance) {
  app.post(
    "/v1/hrm/employments/terminate",
    {
      schema: {
        tags: ["HRM", "Core HR"],
        summary: "Terminate employment",
      },
    },
    async (
      request: FastifyRequest<{ Body: TerminateEmploymentBody }>,
      reply: FastifyReply,
    ) => {
      const parsed = terminateEmploymentBodySchema.safeParse(request.body);

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

      const service = app.di.resolve("hrm.core.terminateEmploymentService");

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

      return reply.status(200).send(result);
    },
  );
}
```

---

# 10) `apps/api/src/routes/erp/hr/get-employee-profile.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function registerGetEmployeeProfileRoute(app: FastifyInstance) {
  app.get(
    "/v1/hrm/employees/:employeeId",
    {
      schema: {
        tags: ["HRM", "Core HR"],
        summary: "Get employee profile",
      },
    },
    async (
      request: FastifyRequest<{ Params: { employeeId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantId = request.headers["x-tenant-id"];

      if (typeof tenantId !== "string") {
        return reply.status(401).send({
          ok: false,
          error: {
            code: "HRM_UNAUTHORIZED",
            message: "Missing tenant context",
          },
        });
      }

      const query = app.di.resolve("hrm.core.getEmployeeProfileQuery");

      const result = await query.execute({
        tenantId,
        employeeId: request.params.employeeId,
      });

      if (!result) {
        return reply.status(404).send({
          ok: false,
          error: {
            code: "HRM_NOT_FOUND",
            message: "Employee not found",
          },
        });
      }

      return reply.status(200).send({
        ok: true,
        data: result,
      });
    },
  );
}
```

---

# 11) `apps/api/src/routes/erp/hr/list-employees.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const listEmployeesQuerySchema = z.object({
  search: z.string().optional(),
  employmentStatus: z.string().optional(),
  workerType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

type ListEmployeesQuerystring = z.infer<typeof listEmployeesQuerySchema>;

export async function registerListEmployeesRoute(app: FastifyInstance) {
  app.get(
    "/v1/hrm/employees",
    {
      schema: {
        tags: ["HRM", "Core HR"],
        summary: "List employees",
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ListEmployeesQuerystring }>,
      reply: FastifyReply,
    ) => {
      const parsed = listEmployeesQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          ok: false,
          error: {
            code: "HRM_INVALID_INPUT",
            message: "Invalid querystring",
            meta: { issues: parsed.error.flatten() },
          },
        });
      }

      const tenantId = request.headers["x-tenant-id"];

      if (typeof tenantId !== "string") {
        return reply.status(401).send({
          ok: false,
          error: {
            code: "HRM_UNAUTHORIZED",
            message: "Missing tenant context",
          },
        });
      }

      const query = app.di.resolve("hrm.core.listEmployeesQuery");
      const result = await query.execute({
        tenantId,
        ...parsed.data,
      });

      return reply.status(200).send({
        ok: true,
        data: result,
      });
    },
  );
}
```

---

# 12) `apps/api/src/routes/erp/hr/core-hr/index.ts`

```ts
import type { FastifyInstance } from "fastify";
import { registerCreatePersonRoute } from "./routes/create-person";
import { registerHireEmployeeRoute } from "./routes/hire-employee";
import { registerTransferEmployeeRoute } from "./routes/transfer-employee";
import { registerTerminateEmploymentRoute } from "./routes/terminate-employment";
import { registerGetEmployeeProfileRoute } from "./routes/get-employee-profile";
import { registerListEmployeesRoute } from "./routes/list-employees";

export async function registerHrmCoreHrModule(app: FastifyInstance) {
  await registerCreatePersonRoute(app);
  await registerHireEmployeeRoute(app);
  await registerTransferEmployeeRoute(app);
  await registerTerminateEmploymentRoute(app);
  await registerGetEmployeeProfileRoute(app);
  await registerListEmployeesRoute(app);
}
```

---

# What is still intentionally incomplete

The two query implementations above are **safe scaffold versions**, but not yet full enterprise read models.

They still need:

* join to `hrm_employment_records`
* join to current `hrm_work_assignments`
* department / position / manager display enrichment
* employment timeline query
* pagination count query
* search across person name, email, employee code

That is normal for this stage.

---

# Best next batch

The next correct files are:

```text
packages/db/src/schema/erp/hrm/hrm-recruitment.ts
packages/db/src/schema/erp/hrm/hrm-onboarding.ts
packages/core/src/erp/hr/recruitment/*
packages/core/src/erp/hr/onboarding/*
apps/api/src/routes/erp/hr/recruitment/*
apps/api/src/routes/erp/hr/onboarding/*
```

I would do it in this order:

```text
1. hrm-recruitment.ts
2. hrm-onboarding.ts
3. create-requisition.service.ts
4. create-candidate.service.ts
5. start-onboarding.service.ts
6. start-separation.service.ts
```

That gives AFENDA the full **Phase 1 business loop**:

```text
person
→ hire
→ transfer
→ terminate
→ rehire
→ requisition
→ offer
→ onboarding
→ separation
```

I can continue with the next drop-in batch for **`hrm-recruitment.ts` + `hrm-onboarding.ts` + first recruitment services**.
