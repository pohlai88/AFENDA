import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  addValidUntilAfterValidFromIssue,
  ApprovalOptionalCommentSchema,
  ApprovalOptionalReasonSchema,
  ApprovalTitleSchema,
} from "../approval.shared.js";

describe("approval.shared", () => {
  it("parses trimmed approval title", () => {
    const parsed = ApprovalTitleSchema.parse("  Approve invoice  ");
    expect(parsed).toBe("Approve invoice");
  });

  it("defaults optional reason and comment to null", () => {
    expect(ApprovalOptionalReasonSchema.parse(undefined)).toBeNull();
    expect(ApprovalOptionalCommentSchema.parse(undefined)).toBeNull();
  });

  it("adds issue when validUntil is not after validFrom", () => {
    const DateRangeSchema = z
      .object({
        validFrom: z.string(),
        validUntil: z.string(),
      })
      .superRefine(addValidUntilAfterValidFromIssue);

    const result = DateRangeSchema.safeParse({
      validFrom: "2026-06-10",
      validUntil: "2026-06-01",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.path).toEqual(["validUntil"]);
  });
});
