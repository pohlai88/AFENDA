import { z } from "zod";

export function nullableDefault<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullable().default(null);
}

export function composeRefinements<T extends z.ZodTypeAny>(
  schema: T,
  refinements: Array<(schema: T) => T>,
): T {
  return refinements.reduce((current, refine) => refine(current), schema);
}
