import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  addPresenterDurationIssue,
  AgendaItemCommandAddFieldsSchema,
  AgendaItemEntityFieldsSchema,
  withPresenterDurationRefinement,
} from "../agenda-item.shared.js";

describe("agenda-item.shared", () => {
  it("normalizes nullable fields to null for entity fields", () => {
    const parsed = AgendaItemEntityFieldsSchema.parse({
      sortOrder: 1,
      title: "Budget review",
    });

    expect(parsed.description).toBeNull();
    expect(parsed.presenterId).toBeNull();
    expect(parsed.durationMinutes).toBeNull();
  });

  it("normalizes omitted nullable add-command fields", () => {
    const parsed = AgendaItemCommandAddFieldsSchema.parse({
      title: "Budget review",
    });

    expect(parsed.description).toBeNull();
    expect(parsed.presenterId).toBeNull();
    expect(parsed.durationMinutes).toBeNull();
  });

  it("adds refinement issue when presenter is set without duration", () => {
    const RefinedSchema = withPresenterDurationRefinement(AgendaItemCommandAddFieldsSchema);

    const result = RefinedSchema.safeParse({
      title: "Budget review",
      presenterId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.path).toEqual(["durationMinutes"]);
  });

  it("exposes a reusable issue helper", () => {
    const issues: Array<{ message?: string }> = [];

    const ctx = {
      addIssue: (issue: string | { message?: string }) => {
        if (typeof issue === "string") {
          issues.push({ message: issue });
          return;
        }

        issues.push({ message: issue.message });
      },
    } as unknown as z.RefinementCtx;

    addPresenterDurationIssue({ presenterId: "22222222-2222-4222-8222-222222222222" }, ctx);

    expect(issues.some((issue) => issue.message?.includes("durationMinutes"))).toBe(true);
  });
});
