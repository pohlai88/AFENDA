import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmPositions, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CreatePositionInput, CreatePositionOutput } from "../dto/create-position.dto";

type PositionStatus = "draft" | "open" | "filled" | "frozen" | "closed";

function normalizePositionStatus(value: string | undefined): PositionStatus {
  switch (value) {
    case "draft":
    case "open":
    case "filled":
    case "frozen":
    case "closed":
      return value;
    default:
      return "open";
  }
}

function buildPositionCode(): string {
  return `POS-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createPosition(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreatePositionInput,
): Promise<HrmResult<CreatePositionOutput>> {
  if (!input.positionTitle || !input.legalEntityId || !input.effectiveFrom) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "positionTitle, legalEntityId, and effectiveFrom are required",
    );
  }

  const positionCode = input.positionCode ?? buildPositionCode();
  const positionStatus = normalizePositionStatus(input.positionStatus);

  try {
    const existing = await db
      .select({ id: hrmPositions.id })
      .from(hrmPositions)
      .where(and(eq(hrmPositions.orgId, orgId), eq(hrmPositions.positionCode, positionCode)));

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "positionCode already exists", { positionCode });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmPositions)
        .values({
          orgId,
          positionCode,
          positionTitle: input.positionTitle,
          legalEntityId: input.legalEntityId,
          orgUnitId: input.orgUnitId,
          jobId: input.jobId,
          gradeId: input.gradeId,
          positionStatus,
          isBudgeted: input.isBudgeted ?? true,
          headcountLimit: input.headcountLimit ?? 1,
          effectiveFrom: sql`${input.effectiveFrom}::timestamptz`,
          isCurrent: true,
        })
        .returning({ id: hrmPositions.id, positionCode: hrmPositions.positionCode });

      if (!row) {
        throw new Error("Failed to insert position");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.POSITION_CREATED,
        entityType: "hrm_position",
        entityId: row.id,
        correlationId,
        details: { positionId: row.id, positionCode: row.positionCode },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.POSITION_CREATED",
        version: "1",
        correlationId,
        payload: { positionId: row.id, positionCode: row.positionCode },
      });

      return { positionId: row.id, positionCode: row.positionCode };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create position", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}