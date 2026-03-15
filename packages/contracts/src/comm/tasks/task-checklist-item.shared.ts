import { z } from "zod";

export const TaskChecklistItemTextSchema = z.string().trim().min(1).max(500);

export type TaskChecklistItemText = z.infer<typeof TaskChecklistItemTextSchema>;
