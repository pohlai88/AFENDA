import { describe, expect, it } from "vitest";
import {
  ArchiveProjectCommandSchema,
  CreateProjectCommandSchema,
  UpdateProjectCommandSchema,
} from "../project.commands.js";

const IDEMPOTENCY_KEY = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PROJECT_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

describe("project.commands – CreateProjectCommandSchema", () => {
  it("accepts valid create payload", () => {
    const result = CreateProjectCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      name: "Platform Migration",
      startDate: "2026-05-01",
      targetDate: "2026-06-01",
      color: "#14B8A6",
    });

    expect(result.success).toBe(true);
  });

  it("rejects date range where targetDate is earlier than startDate", () => {
    const result = CreateProjectCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      name: "Platform Migration",
      startDate: "2026-06-01",
      targetDate: "2026-05-01",
    });

    expect(result.success).toBe(false);
  });
});

describe("project.commands – UpdateProjectCommandSchema", () => {
  it("accepts partial update payload", () => {
    const result = UpdateProjectCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      projectId: PROJECT_ID,
      description: "Updated project narrative",
    });

    expect(result.success).toBe(true);
  });
});

describe("project.commands – ArchiveProjectCommandSchema", () => {
  it("requires non-empty reason when provided", () => {
    const result = ArchiveProjectCommandSchema.safeParse({
      idempotencyKey: IDEMPOTENCY_KEY,
      projectId: PROJECT_ID,
      reason: "   ",
    });

    expect(result.success).toBe(false);
  });
});
