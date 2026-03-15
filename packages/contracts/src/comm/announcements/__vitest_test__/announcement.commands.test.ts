import { describe, expect, it } from "vitest";
import { CreateAnnouncementCommandSchema } from "../announcement.commands.js";

describe("CreateAnnouncementCommandSchema", () => {
  const baseCommand = {
    idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
    title: "Security update",
    body: "Body copy",
  };

  it("defaults org audienceIds to an empty array", () => {
    const result = CreateAnnouncementCommandSchema.safeParse({
      ...baseCommand,
      audienceType: "org",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audienceIds).toEqual([]);
    }
  });

  it("rejects org audience with ids present", () => {
    const result = CreateAnnouncementCommandSchema.safeParse({
      ...baseCommand,
      audienceType: "org",
      audienceIds: ["123e4567-e89b-12d3-a456-426614174001"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "audienceIds must be empty when audienceType is 'org'",
      );
    }
  });

  it("accepts team audience with at least one id", () => {
    const result = CreateAnnouncementCommandSchema.safeParse({
      ...baseCommand,
      audienceType: "team",
      audienceIds: ["123e4567-e89b-12d3-a456-426614174001"],
    });

    expect(result.success).toBe(true);
  });

  it("accepts role audience with at least one id", () => {
    const result = CreateAnnouncementCommandSchema.safeParse({
      ...baseCommand,
      audienceType: "role",
      audienceIds: ["123e4567-e89b-12d3-a456-426614174001"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects team audience when audienceIds is empty", () => {
    const result = CreateAnnouncementCommandSchema.safeParse({
      ...baseCommand,
      audienceType: "team",
      audienceIds: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "audienceIds must contain at least one id when audienceType is 'team' or 'role'",
      );
    }
  });

  it("rejects role audience when audienceIds is empty", () => {
    const result = CreateAnnouncementCommandSchema.safeParse({
      ...baseCommand,
      audienceType: "role",
      audienceIds: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "audienceIds must contain at least one id when audienceType is 'team' or 'role'",
      );
    }
  });
});
