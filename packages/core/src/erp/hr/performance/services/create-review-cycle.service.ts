import type { DbClient } from "@afenda/db";
import { auditLog, hrmReviewCycles, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateReviewCycleInput {
  cycleCode: string;
  cycleName: string;
  startDate: string;
  endDate: string;
}

export interface CreateReviewCycleOutput {
  reviewCycleId: string;
  cycleCode: string;
  status: string;
}

export async function createReviewCycle(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateReviewCycleInput,
): Promise<HrmResult<CreateReviewCycleOutput>> {
  if (!input.cycleCode || !input.cycleName || !input.startDate || !input.endDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "cycleCode, cycleName, startDate, and endDate are required");
  }

  if (input.startDate > input.endDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "startDate must be before or equal to endDate");
  }

  try {
    const [existing] = await db
      .select({ id: hrmReviewCycles.id })
      .from(hrmReviewCycles)
      .where(
        and(
          eq(hrmReviewCycles.orgId, orgId),
          eq(hrmReviewCycles.cycleCode, input.cycleCode),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Review cycle with this code already exists", {
        cycleCode: input.cycleCode,
      });
    }

    const [row] = await db
      .insert(hrmReviewCycles)
      .values({
        orgId,
        cycleCode: input.cycleCode,
        cycleName: input.cycleName,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "draft",
      })
      .returning({
        id: hrmReviewCycles.id,
        cycleCode: hrmReviewCycles.cycleCode,
        status: hrmReviewCycles.status,
      });

    if (!row) {
      throw new Error("Failed to create review cycle");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.REVIEW_CYCLE_CREATED,
      entityType: "hrm_review_cycle",
      entityId: row.id,
      correlationId,
      details: {
        reviewCycleId: row.id,
        cycleCode: row.cycleCode,
        status: row.status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.REVIEW_CYCLE_CREATED",
      version: "1",
      correlationId,
      payload: {
        reviewCycleId: row.id,
        cycleCode: row.cycleCode,
        status: row.status,
      },
    });

    return ok({
      reviewCycleId: row.id,
      cycleCode: row.cycleCode,
      status: row.status,
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create review cycle", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
