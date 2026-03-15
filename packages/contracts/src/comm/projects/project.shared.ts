import { z } from "zod";

export const ProjectNameSchema = z.string().trim().min(1).max(200);
export const ProjectDescriptionSchema = z.string().trim().max(20_000);
export const ProjectReasonSchema = z.string().trim().max(500);
export const ProjectColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/);

export type ProjectName = z.infer<typeof ProjectNameSchema>;
export type ProjectDescription = z.infer<typeof ProjectDescriptionSchema>;
export type ProjectReason = z.infer<typeof ProjectReasonSchema>;
export type ProjectColor = z.infer<typeof ProjectColorSchema>;
