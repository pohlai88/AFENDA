import { z } from "zod";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { nullableDefault } from "./schema.helpers.js";

export const AgendaItemTitleSchema = z.string().trim().min(1).max(500);
export const AgendaItemDescriptionSchema = z.string().trim().max(10_000);
export const AgendaItemSortOrderSchema = z.number().int().min(0);
export const AgendaItemDurationMinutesSchema = z.number().int().min(1).max(480);

// Persisted entity values normalize absent nullable fields to null.
export const AgendaItemEntityFieldsSchema = z.object({
  sortOrder: AgendaItemSortOrderSchema,
  title: AgendaItemTitleSchema,
  description: nullableDefault(AgendaItemDescriptionSchema),
  presenterId: nullableDefault(PrincipalIdSchema),
  durationMinutes: nullableDefault(AgendaItemDurationMinutesSchema),
});

// Create command values also normalize omitted nullable fields to null for stable downstream handling.
export const AgendaItemCommandAddFieldsSchema = z.object({
  title: AgendaItemTitleSchema,
  description: nullableDefault(AgendaItemDescriptionSchema).optional(),
  sortOrder: AgendaItemSortOrderSchema.optional(),
  presenterId: nullableDefault(PrincipalIdSchema).optional(),
  durationMinutes: nullableDefault(AgendaItemDurationMinutesSchema).optional(),
});

export const AgendaItemUpdateFieldKeys = [
  "title",
  "description",
  "sortOrder",
  "presenterId",
  "durationMinutes",
] as const;

// Update command values intentionally preserve undefined to indicate field omission in partial updates.
const AgendaItemCommandUpdateFieldShape: Record<
  (typeof AgendaItemUpdateFieldKeys)[number],
  z.ZodTypeAny
> = {
  title: AgendaItemTitleSchema.optional(),
  description: AgendaItemDescriptionSchema.nullable().optional(),
  sortOrder: AgendaItemSortOrderSchema.optional(),
  presenterId: PrincipalIdSchema.nullable().optional(),
  durationMinutes: AgendaItemDurationMinutesSchema.nullable().optional(),
};

export const AgendaItemCommandUpdateFieldsSchema = z.object(AgendaItemCommandUpdateFieldShape);

export function addPresenterDurationIssue(
  data: { presenterId?: unknown; durationMinutes?: unknown },
  ctx: z.RefinementCtx,
): void {
  if (data.presenterId && !data.durationMinutes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Agenda items with a presenter must include durationMinutes.",
      path: ["durationMinutes"],
    });
  }
}

export function withPresenterDurationRefinement<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((data, ctx) => {
    if (typeof data === "object" && data !== null) {
      addPresenterDurationIssue(data as { presenterId?: unknown; durationMinutes?: unknown }, ctx);
    }
  }) as T;
}
