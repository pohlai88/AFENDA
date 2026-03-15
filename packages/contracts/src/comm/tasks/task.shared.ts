import { z } from "zod";

export const TaskTitleSchema = z.string().trim().min(1).max(500);
export const TaskDescriptionSchema = z.string().trim().max(20_000);
export const TaskReasonSchema = z.string().trim().min(1).max(500);
export const TaskContextEntityTypeSchema = z.string().trim().min(1).max(128);
export const TaskNumberSchema = z.string().trim().min(1).max(64);

export type TaskTitle = z.infer<typeof TaskTitleSchema>;
export type TaskDescription = z.infer<typeof TaskDescriptionSchema>;
export type TaskReason = z.infer<typeof TaskReasonSchema>;
export type TaskContextEntityType = z.infer<typeof TaskContextEntityTypeSchema>;
export type TaskNumber = z.infer<typeof TaskNumberSchema>;
