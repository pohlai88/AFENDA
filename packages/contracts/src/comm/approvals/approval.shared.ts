import { z } from "zod";

export const ApprovalNumberSchema = z.string().trim().min(1).max(64);
export const ApprovalTitleSchema = z.string().trim().min(1).max(500);
export const ApprovalLabelSchema = z.string().trim().min(1).max(200);
export const ApprovalReasonSchema = z.string().trim().min(1).max(500);
export const ApprovalOptionalReasonSchema = z.string().trim().max(500).nullable().default(null);
export const ApprovalOptionalCommentSchema = z.string().trim().max(2000).nullable().default(null);
export const ApprovalSourceEntityTypeSchema = z.string().trim().min(1).max(128);
export const ApprovalPolicyNameSchema = z.string().trim().min(1).max(200);

export function addValidUntilAfterValidFromIssue(
  data: { validFrom: string; validUntil: string },
  ctx: z.RefinementCtx,
): void {
  if (data.validUntil <= data.validFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "validUntil must be after validFrom.",
      path: ["validUntil"],
    });
  }
}

export type ApprovalNumber = z.infer<typeof ApprovalNumberSchema>;
export type ApprovalTitle = z.infer<typeof ApprovalTitleSchema>;
export type ApprovalLabel = z.infer<typeof ApprovalLabelSchema>;
export type ApprovalReason = z.infer<typeof ApprovalReasonSchema>;
export type ApprovalOptionalReason = z.infer<typeof ApprovalOptionalReasonSchema>;
export type ApprovalOptionalComment = z.infer<typeof ApprovalOptionalCommentSchema>;
export type ApprovalSourceEntityType = z.infer<typeof ApprovalSourceEntityTypeSchema>;
export type ApprovalPolicyName = z.infer<typeof ApprovalPolicyNameSchema>;
