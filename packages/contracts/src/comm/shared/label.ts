import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

export const CommLabelIdSchema = UuidSchema.brand<"CommLabelId">();
export const CommLabelAssignmentIdSchema = UuidSchema.brand<"CommLabelAssignmentId">();

export const CommLabelEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "document",
  "board_meeting",
  "announcement",
] as const;

export const CommLabelEntityTypeSchema = z.enum(CommLabelEntityTypeValues);

export const CommLabelColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "color must be a hex string like #14B8A6");

export const CommLabelSchema = z.object({
  id: CommLabelIdSchema,
  orgId: OrgIdSchema,
  name: z.string().trim().min(1).max(50),
  color: CommLabelColorSchema,
  createdByPrincipalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const CommLabelAssignmentSchema = z.object({
  id: CommLabelAssignmentIdSchema,
  orgId: OrgIdSchema,
  labelId: CommLabelIdSchema,
  entityType: CommLabelEntityTypeSchema,
  entityId: z.string().trim().min(1),
  assignedByPrincipalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
});

export const CreateLabelCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  name: z.string().trim().min(1).max(50),
  color: CommLabelColorSchema,
});

export const UpdateLabelCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  labelId: CommLabelIdSchema,
  name: z.string().trim().min(1).max(50).optional(),
  color: CommLabelColorSchema.optional(),
});

export const DeleteLabelCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  labelId: CommLabelIdSchema,
});

export const AssignLabelCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  labelId: CommLabelIdSchema,
  entityType: CommLabelEntityTypeSchema,
  entityId: z.string().trim().min(1),
});

export const UnassignLabelCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  labelId: CommLabelIdSchema,
  entityType: CommLabelEntityTypeSchema,
  entityId: z.string().trim().min(1),
});

export type CommLabelId = z.infer<typeof CommLabelIdSchema>;
export type CommLabelAssignmentId = z.infer<typeof CommLabelAssignmentIdSchema>;
export type CommLabelEntityType = z.infer<typeof CommLabelEntityTypeSchema>;
export type CommLabel = z.infer<typeof CommLabelSchema>;
export type CommLabelAssignment = z.infer<typeof CommLabelAssignmentSchema>;
export type CreateLabelCommand = z.infer<typeof CreateLabelCommandSchema>;
export type UpdateLabelCommand = z.infer<typeof UpdateLabelCommandSchema>;
export type DeleteLabelCommand = z.infer<typeof DeleteLabelCommandSchema>;
export type AssignLabelCommand = z.infer<typeof AssignLabelCommandSchema>;
export type UnassignLabelCommand = z.infer<typeof UnassignLabelCommandSchema>;
