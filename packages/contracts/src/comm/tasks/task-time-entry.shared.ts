import { z } from "zod";

export const TaskTimeEntryMinutesSchema = z.number().int().positive();
export const TaskTimeEntryDescriptionSchema = z.string().trim().max(2_000);

export type TaskTimeEntryMinutes = z.infer<typeof TaskTimeEntryMinutesSchema>;
export type TaskTimeEntryDescription = z.infer<typeof TaskTimeEntryDescriptionSchema>;
