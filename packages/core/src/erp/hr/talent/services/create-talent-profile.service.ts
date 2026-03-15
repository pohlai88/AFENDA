import type { DbClient } from "@afenda/db";
import { auditLog, hrmEmploymentRecords, hrmTalentProfiles, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateTalentProfileInput {
  employmentId: string;
  potentialScore?: number | null;
  readinessScore?: number | null;
  careerAspiration?: string | null;
}

export interface CreateTalentProfileOutput {
  talentProfileId: string;
}

export async function createTalentProfile(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateTalentProfileInput,
): Promise<HrmResult<CreateTalentProfileOutput>> {
  if (!input.employmentId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "employmentId is required");
  }

  try {
    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.id, input.employmentId),
        ),
      );

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    const [existing] = await db
      .select({ id: hrmTalentProfiles.id })
      .from(hrmTalentProfiles)
      .where(
        and(
          eq(hrmTalentProfiles.orgId, orgId),
          eq(hrmTalentProfiles.employmentId, input.employmentId),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Talent profile already exists for this employment", {
        employmentId: input.employmentId,
      });
    }

    const [row] = await db
      .insert(hrmTalentProfiles)
      .values({
        orgId,
        employmentId: input.employmentId,
        potentialScore: input.potentialScore ?? null,
        readinessScore: input.readinessScore ?? null,
        careerAspiration: input.careerAspiration ?? null,
      })
      .returning({ id: hrmTalentProfiles.id });

    if (!row) {
      throw new Error("Failed to create talent profile");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.TALENT_PROFILE_CREATED,
      entityType: "hrm_talent_profile",
      entityId: row.id,
      correlationId,
      details: {
        talentProfileId: row.id,
        employmentId: input.employmentId,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.TALENT_PROFILE_CREATED",
      version: "1",
      correlationId,
      payload: {
        talentProfileId: row.id,
        employmentId: input.employmentId,
      },
    });

    return ok({ talentProfileId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create talent profile", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
