import { z } from "zod";

export const WorkflowNameSchema = z.string().trim().min(1).max(200);
export const WorkflowDescriptionSchema = z.string().trim().max(2_000);
export const WorkflowRunErrorSchema = z.string().trim().min(1).max(2_000);

export type WorkflowName = z.infer<typeof WorkflowNameSchema>;
export type WorkflowDescription = z.infer<typeof WorkflowDescriptionSchema>;
export type WorkflowRunError = z.infer<typeof WorkflowRunErrorSchema>;
