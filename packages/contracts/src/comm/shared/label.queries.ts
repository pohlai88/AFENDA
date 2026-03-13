import { z } from "zod";
import { CommListLimitSchema } from "./query.js";
import { makeCommListResponseSchema } from "./response.js";
import { CommLabelEntityTypeSchema, CommLabelIdSchema, CommLabelSchema } from "./label.js";

const EntityIdStringSchema = z.string().trim().min(1);

export const ListLabelsQuerySchema = z.object({
  entityType: CommLabelEntityTypeSchema.optional(),
  entityId: EntityIdStringSchema.optional(),
  limit: CommListLimitSchema,
  cursor: CommLabelIdSchema.optional(),
});

export const ListLabelsResponseSchema = makeCommListResponseSchema(CommLabelSchema);

export type ListLabelsQuery = z.infer<typeof ListLabelsQuerySchema>;
export type ListLabelsResponse = z.infer<typeof ListLabelsResponseSchema>;
