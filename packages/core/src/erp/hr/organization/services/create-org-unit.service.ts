import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmOrgUnits, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CreateOrgUnitInput, CreateOrgUnitOutput } from "../dto/create-org-unit.dto";

function buildOrgUnitCode(): string {
  return `ORG-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createOrgUnit(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateOrgUnitInput,
): Promise<HrmResult<CreateOrgUnitOutput>> {
  if (!input.legalEntityId || !input.orgUnitName) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "legalEntityId and orgUnitName are required");
  }

  const orgUnitCode = input.orgUnitCode ?? buildOrgUnitCode();

  try {
    if (input.parentOrgUnitId) {
      const [parent] = await db
        .select({ id: hrmOrgUnits.id })
        .from(hrmOrgUnits)
        .where(and(eq(hrmOrgUnits.orgId, orgId), eq(hrmOrgUnits.id, input.parentOrgUnitId)));

      if (!parent) {
        return err(HRM_ERROR_CODES.ORG_UNIT_NOT_FOUND, "Parent org unit not found", {
          parentOrgUnitId: input.parentOrgUnitId,
        });
      }
    }

    const existing = await db
      .select({ id: hrmOrgUnits.id })
      .from(hrmOrgUnits)
      .where(and(eq(hrmOrgUnits.orgId, orgId), eq(hrmOrgUnits.orgUnitCode, orgUnitCode)));

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "orgUnitCode already exists", { orgUnitCode });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmOrgUnits)
        .values({
          orgId,
          legalEntityId: input.legalEntityId,
          orgUnitCode,
          orgUnitName: input.orgUnitName,
          parentOrgUnitId: input.parentOrgUnitId,
          status: input.status ?? "active",
        })
        .returning({ id: hrmOrgUnits.id, orgUnitCode: hrmOrgUnits.orgUnitCode });

      if (!row) {
        throw new Error("Failed to insert org unit");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.ORG_UNIT_CREATED,
        entityType: "hrm_org_unit",
        entityId: row.id,
        correlationId,
        details: {
          orgUnitId: row.id,
          orgUnitCode: row.orgUnitCode,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.ORG_UNIT_CREATED",
        version: "1",
        correlationId,
        payload: {
          orgUnitId: row.id,
          orgUnitCode: row.orgUnitCode,
        },
      });

      return {
        orgUnitId: row.id,
        orgUnitCode: row.orgUnitCode,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create org unit", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}