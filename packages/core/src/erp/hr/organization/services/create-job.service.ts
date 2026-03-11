import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmJobs, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CreateJobInput, CreateJobOutput } from "../dto/create-job.dto";

function buildJobCode(): string {
  return `JOB-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createJob(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateJobInput,
): Promise<HrmResult<CreateJobOutput>> {
  if (!input.jobTitle) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "jobTitle is required");
  }

  const jobCode = input.jobCode ?? buildJobCode();

  try {
    const existing = await db
      .select({ id: hrmJobs.id })
      .from(hrmJobs)
      .where(and(eq(hrmJobs.orgId, orgId), eq(hrmJobs.jobCode, jobCode)));

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "jobCode already exists", { jobCode });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmJobs)
        .values({
          orgId,
          jobCode,
          jobTitle: input.jobTitle,
          status: input.status ?? "active",
        })
        .returning({ id: hrmJobs.id, jobCode: hrmJobs.jobCode });

      if (!row) {
        throw new Error("Failed to insert job");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.JOB_CREATED,
        entityType: "hrm_job",
        entityId: row.id,
        correlationId,
        details: { jobId: row.id, jobCode: row.jobCode },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.JOB_CREATED",
        version: "1",
        correlationId,
        payload: { jobId: row.id, jobCode: row.jobCode },
      });

      return { jobId: row.id, jobCode: row.jobCode };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create job", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}