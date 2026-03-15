import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { CommCommentIdSchema } from "../shared/comment.js";
import { CommChatterMessageBodyTextSchema } from "./chatter.shared.js";

/** ID */
export const CommChatterMessageIdSchema = CommCommentIdSchema;

/** Context entity types */
export const CommChatterContextEntityTypeValues = ["task", "project", "document"] as const;
export const CommChatterContextEntityTypeSchema = z.enum(CommChatterContextEntityTypeValues);

/** Entity */
export const CommChatterMessageSchema = z.object({
  id: CommChatterMessageIdSchema,
  orgId: OrgIdSchema,
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  parentMessageId: CommChatterMessageIdSchema.nullable().default(null),
  authorPrincipalId: PrincipalIdSchema,
  body: CommChatterMessageBodyTextSchema,
  editedAt: UtcDateTimeSchema.nullable().default(null),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

/** Types */
export type CommChatterMessageId = z.infer<typeof CommChatterMessageIdSchema>;
export type CommChatterContextEntityType = z.infer<typeof CommChatterContextEntityTypeSchema>;
export type CommChatterMessage = z.infer<typeof CommChatterMessageSchema>;
