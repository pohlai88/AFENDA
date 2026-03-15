import { z } from "zod";
import { CommProjectIdSchema } from "./project-id.js";

export const ResolveCommProjectIdQuerySchema = z.object({
  projectId: CommProjectIdSchema,
});

export type ResolveCommProjectIdQuery = z.infer<typeof ResolveCommProjectIdQuerySchema>;
