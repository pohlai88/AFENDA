import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CreateActionItemCommandFieldsSchema,
  RecordMinutesCommandFieldsSchema,
  UpdateActionItemCommandFieldsSchema,
  ActionItemStatusSchema,
  withActionItemRefinements,
  withActionItemLifecycleRefinement,
  withActionItemUpdateRefinement,
  withDueDateFutureRefinement,
} from "../minutes.shared.js";

describe("minutes.shared", () => {
  it("applies defaults for record minutes and action item create fields", () => {
    const minutes = RecordMinutesCommandFieldsSchema.parse({
      content: "Resolved to approve budget.",
    });
    const actionItem = CreateActionItemCommandFieldsSchema.parse({
      title: "Send follow-up",
    });

    expect(minutes.resolutionId).toBeNull();
    expect(minutes.metadata).toEqual({});
    expect(actionItem.description).toBeNull();
    expect(actionItem.assigneeId).toBeNull();
    expect(actionItem.dueDate).toBeNull();
  });

  it("keeps update action-item fields optional", () => {
    const parsed = UpdateActionItemCommandFieldsSchema.parse({});

    expect(parsed).toEqual({});
  });

  it("enforces due date and update-field refinements", () => {
    const Schema = withDueDateFutureRefinement(
      withActionItemUpdateRefinement(
        z.object({
          ...UpdateActionItemCommandFieldsSchema.shape,
        }),
      ),
    );

    const emptyResult = Schema.safeParse({});
    const pastDueResult = Schema.safeParse({ dueDate: "2020-01-01" });
    const validResult = Schema.safeParse({ title: "Send follow-up" });

    expect(emptyResult.success).toBe(false);
    expect(pastDueResult.success).toBe(false);
    expect(validResult.success).toBe(true);
  });

  it("enforces status lifecycle rules for action items", () => {
    const Schema = withActionItemLifecycleRefinement(
      z.object({
        status: ActionItemStatusSchema,
        assigneeId: z.string().uuid().nullable(),
        closedAt: z.string().datetime().nullable(),
      }),
    );

    const missingAssignee = Schema.safeParse({
      status: "in_progress",
      assigneeId: null,
      closedAt: null,
    });
    const missingClosedAt = Schema.safeParse({
      status: "done",
      assigneeId: "11111111-1111-4111-8111-111111111111",
      closedAt: null,
    });
    const valid = Schema.safeParse({
      status: "done",
      assigneeId: "11111111-1111-4111-8111-111111111111",
      closedAt: "2026-06-01T10:00:00.000Z",
    });

    expect(missingAssignee.success).toBe(false);
    expect(missingClosedAt.success).toBe(false);
    expect(valid.success).toBe(true);
  });

  it("composes update and lifecycle refinements", () => {
    const Schema = withActionItemRefinements(
      z.object({
        ...UpdateActionItemCommandFieldsSchema.shape,
        closedAt: z.string().datetime().nullable().optional(),
      }),
    );

    const noOp = Schema.safeParse({});
    const missingClosedAt = Schema.safeParse({ status: "done" });
    const valid = Schema.safeParse({ status: "done", closedAt: "2026-06-01T10:00:00.000Z" });

    expect(noOp.success).toBe(false);
    expect(missingClosedAt.success).toBe(false);
    expect(valid.success).toBe(true);
  });
});
