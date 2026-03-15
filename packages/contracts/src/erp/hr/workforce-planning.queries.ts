import { z } from "zod";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const ListWorkforcePlansQuerySchema = z.object({
  orgId: OrgIdSchema,
  planYear: z.number().int().min(2000).max(2100).optional(),
});

export const GetScenarioProjectionQuerySchema = z.object({
  orgId: OrgIdSchema,
  workforcePlanId: UuidSchema,
  scenarioId: UuidSchema,
});

export const ListHeadcountByOrgQuerySchema = z.object({
  orgId: OrgIdSchema,
  orgUnitId: UuidSchema.optional(),
  planYear: z.number().int().min(2000).max(2100),
});
