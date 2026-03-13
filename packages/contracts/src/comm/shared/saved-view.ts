import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

// ─── ID Brand ─────────────────────────────────────────────────────────────────

export const CommSavedViewIdSchema = UuidSchema.brand<"CommSavedViewId">();

// ─── Enum Values & Schema ─────────────────────────────────────────────────────

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

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const NameSchema = z.string().trim().min(1).max(100);
const JsonObjectSchema = z.record(z.string(), z.unknown());
const JsonArraySchema = z.array(z.unknown());

// ─── Entity Schema ────────────────────────────────────────────────────────────

export const CommSavedViewSchema = z
  .object({
    id: CommSavedViewIdSchema,
    orgId: OrgIdSchema,
    principalId: PrincipalIdSchema.nullable().default(null),
    entityType: CommSavedViewEntityTypeSchema,
    name: NameSchema,
    filters: JsonObjectSchema,
    sortBy: JsonArraySchema,
    columns: JsonArraySchema,
    isDefault: z.boolean().default(false),
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.isDefault && !data.principalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default views must be tied to a principal.",
        path: ["principalId"],
      });
    }
  });

// ─── Base Command Schema ──────────────────────────────────────────────────────

const SavedViewCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const SaveViewCommandSchema = SavedViewCommandBase.extend({
  entityType: CommSavedViewEntityTypeSchema,
  name: NameSchema,
  filters: JsonObjectSchema,
  sortBy: JsonArraySchema,
  columns: JsonArraySchema,
  isDefault: z.boolean().optional(),
  isOrgShared: z.boolean().optional().default(false),
});

export const UpdateSavedViewCommandSchema = SavedViewCommandBase.extend({
  viewId: CommSavedViewIdSchema,
  name: NameSchema.optional(),
  filters: JsonObjectSchema.optional(),
  sortBy: JsonArraySchema.optional(),
  columns: JsonArraySchema.optional(),
  isDefault: z.boolean().optional(),
});

export const DeleteSavedViewCommandSchema = SavedViewCommandBase.extend({
  viewId: CommSavedViewIdSchema,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommSavedViewId = z.infer<typeof CommSavedViewIdSchema>;
export type CommSavedViewEntityType = z.infer<typeof CommSavedViewEntityTypeSchema>;
export type CommSavedView = z.infer<typeof CommSavedViewSchema>;
export type SaveViewCommand = z.infer<typeof SaveViewCommandSchema>;
export type UpdateSavedViewCommand = z.infer<typeof UpdateSavedViewCommandSchema>;
export type DeleteSavedViewCommand = z.infer<typeof DeleteSavedViewCommandSchema>;
