import type { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const CommProjectIdSchema = UuidSchema.brand<"CommProjectId">();

export type CommProjectId = z.infer<typeof CommProjectIdSchema>;
