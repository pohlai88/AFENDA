import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

export const CommSavedViewIdSchema = UuidSchema.brand<"CommSavedViewId">();

export const CommSavedViewEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "board_meeting",
  "announcement",
  "document",
  "inbox_item",
] as const;

export const CommSavedViewEntityTypeSchema = z.enum(CommSavedViewEntityTypeValues);

const JsonObjectSchema = z.record(z.string(), z.unknown());
const JsonArraySchema = z.array(z.unknown());

export const CommSavedViewSchema = z.object({
  id: CommSavedViewIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema.nullable(),
  entityType: CommSavedViewEntityTypeSchema,
  name: z.string().trim().min(1).max(100),
  filters: JsonObjectSchema,
  sortBy: JsonArraySchema,
  columns: JsonArraySchema,
  isDefault: z.boolean().default(false),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const SaveViewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  entityType: CommSavedViewEntityTypeSchema,
  name: z.string().trim().min(1).max(100),
  filters: JsonObjectSchema,
  sortBy: JsonArraySchema,
  columns: JsonArraySchema,
  isDefault: z.boolean().optional(),
  isOrgShared: z.boolean().optional().default(false),
});

export const UpdateSavedViewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  viewId: CommSavedViewIdSchema,
  name: z.string().trim().min(1).max(100).optional(),
  filters: JsonObjectSchema.optional(),
  sortBy: JsonArraySchema.optional(),
  columns: JsonArraySchema.optional(),
  isDefault: z.boolean().optional(),
});

export const DeleteSavedViewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  viewId: CommSavedViewIdSchema,
});

export type CommSavedViewId = z.infer<typeof CommSavedViewIdSchema>;
export type CommSavedViewEntityType = z.infer<typeof CommSavedViewEntityTypeSchema>;
export type CommSavedView = z.infer<typeof CommSavedViewSchema>;
export type SaveViewCommand = z.infer<typeof SaveViewCommandSchema>;
export type UpdateSavedViewCommand = z.infer<typeof UpdateSavedViewCommandSchema>;
export type DeleteSavedViewCommand = z.infer<typeof DeleteSavedViewCommandSchema>;
