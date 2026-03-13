import { z } from "zod";
import { makeCommListResponseSchema } from "./response.js";
import { CommSavedViewEntityTypeSchema, CommSavedViewSchema } from "./saved-view.js";

export const ListSavedViewsQuerySchema = z.object({
  entityType: CommSavedViewEntityTypeSchema,
  includeOrgShared: z.boolean().optional().default(true),
  defaultOnly: z.boolean().optional().default(false),
});

export const ListSavedViewsResponseSchema = makeCommListResponseSchema(CommSavedViewSchema);

export type ListSavedViewsQuery = z.infer<typeof ListSavedViewsQuerySchema>;
export type ListSavedViewsResponse = z.infer<typeof ListSavedViewsResponseSchema>;
