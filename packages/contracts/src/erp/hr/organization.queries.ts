import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const ListPositionsInputSchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const PositionListItemSchema = z.object({
  positionId: UuidSchema,
  positionCode: z.string(),
  positionTitle: z.string(),
  legalEntityId: UuidSchema,
  orgUnitId: UuidSchema.nullable(),
  jobId: UuidSchema.nullable(),
  gradeId: UuidSchema.nullable(),
  positionStatus: z.string(),
  isBudgeted: z.boolean(),
  headcountLimit: z.number().int(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  isCurrent: z.boolean(),
});

export const ListPositionsResultSchema = z.object({
  items: z.array(PositionListItemSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const OrgTreeNodeSchema: z.ZodType<{
  orgUnitId: string;
  orgUnitCode: string;
  orgUnitName: string;
  legalEntityId: string;
  parentOrgUnitId: string | null;
  status: string;
  children: Array<{
    orgUnitId: string;
    orgUnitCode: string;
    orgUnitName: string;
    legalEntityId: string;
    parentOrgUnitId: string | null;
    status: string;
    children: unknown[];
  }>;
}> = z.lazy(() =>
  z.object({
    orgUnitId: UuidSchema,
    orgUnitCode: z.string(),
    orgUnitName: z.string(),
    legalEntityId: UuidSchema,
    parentOrgUnitId: UuidSchema.nullable(),
    status: z.string(),
    children: z.array(OrgTreeNodeSchema),
  }),
);

export const PositionIncumbentSchema = z.object({
  employmentId: UuidSchema,
  employeeId: UuidSchema,
  employeeCode: z.string(),
  employmentStatus: z.string(),
  assignmentId: UuidSchema,
  effectiveFrom: z.string(),
});

export const PositionIncumbencyViewSchema = z.object({
  positionId: UuidSchema,
  positionCode: z.string(),
  positionTitle: z.string(),
  legalEntityId: UuidSchema,
  positionStatus: z.string(),
  headcountLimit: z.number().int(),
  incumbents: z.array(PositionIncumbentSchema),
});

export type ListPositionsInput = z.infer<typeof ListPositionsInputSchema>;
export type PositionListItem = z.infer<typeof PositionListItemSchema>;
export type ListPositionsResult = z.infer<typeof ListPositionsResultSchema>;
export type OrgTreeNode = z.infer<typeof OrgTreeNodeSchema>;
export type PositionIncumbent = z.infer<typeof PositionIncumbentSchema>;
export type PositionIncumbencyView = z.infer<typeof PositionIncumbencyViewSchema>;
