import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

// ─── ID Brands ────────────────────────────────────────────────────────────────

export const CommLabelIdSchema = UuidSchema.brand<"CommLabelId">();
export const CommLabelAssignmentIdSchema = UuidSchema.brand<"CommLabelAssignmentId">();

// ─── Enum Values & Schema ─────────────────────────────────────────────────────

export const CommLabelEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "document",
  "board_meeting",
  "announcement",
] as const;

export const CommLabelEntityTypeSchema = z.enum(CommLabelEntityTypeValues);

// ─── Color Schema ─────────────────────────────────────────────────────────────

export const CommLabelColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "color must be a hex string like #14B8A6");

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const NameSchema = z.string().trim().min(1).max(50);
const EntityIdStringSchema = z.string().trim().min(1);

// ─── Entity Schemas ───────────────────────────────────────────────────────────

export const CommLabelSchema = z.object({
  id: CommLabelIdSchema,
  orgId: OrgIdSchema,
  name: NameSchema,
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
  entityId: EntityIdStringSchema,
  assignedByPrincipalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
});

// ─── Base Command Schema ──────────────────────────────────────────────────────

const LabelCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const CreateLabelCommandSchema = LabelCommandBase.extend({
  name: NameSchema,
  color: CommLabelColorSchema,
});

export const UpdateLabelCommandSchema = LabelCommandBase.extend({
  labelId: CommLabelIdSchema,
  name: NameSchema.optional(),
  color: CommLabelColorSchema.optional(),
});

export const DeleteLabelCommandSchema = LabelCommandBase.extend({
  labelId: CommLabelIdSchema,
});

export const AssignLabelCommandSchema = LabelCommandBase.extend({
  labelId: CommLabelIdSchema,
  entityType: CommLabelEntityTypeSchema,
  entityId: EntityIdStringSchema,
});

export const UnassignLabelCommandSchema = LabelCommandBase.extend({
  labelId: CommLabelIdSchema,
  entityType: CommLabelEntityTypeSchema,
  entityId: EntityIdStringSchema,
});

// ─── Types ────────────────────────────────────────────────────────────────────

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
