import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  MeetingCommandCreateFieldsSchema,
  MeetingCommandUpdateFieldsSchema,
  MeetingDurationSchema,
  MeetingNumberSchema,
  MeetingUpdateFieldKeys,
  withChairSecretaryRefinement,
  withMeetingLifecycleTextRefinement,
  withMeetingStatusRefinement,
  withMeetingUpdateRefinement,
} from "../meeting.shared.js";

describe("meeting.shared", () => {
  it("applies create defaults", () => {
    const parsed = MeetingCommandCreateFieldsSchema.parse({
      title: "Quarterly board meeting",
      chairId: "22222222-2222-4222-8222-222222222222",
    });

    expect(parsed.duration).toBe(60);
    expect(parsed.quorumRequired).toBe(1);
    expect(parsed.secretaryId).toBeNull();
    expect(parsed.scheduledAt).toBeNull();
  });

  it("keeps update fields optional", () => {
    const parsed = MeetingCommandUpdateFieldsSchema.parse({});

    expect(parsed).toEqual({});
  });

  it("enforces update and chair/secretary refinements", () => {
    const UpdateSchema = withChairSecretaryRefinement(
      withMeetingUpdateRefinement(
        z.object({
          ...MeetingCommandUpdateFieldsSchema.shape,
        }),
      ),
    );

    const emptyResult = UpdateSchema.safeParse({});
    const samePeopleResult = UpdateSchema.safeParse({
      chairId: "22222222-2222-4222-8222-222222222222",
      secretaryId: "22222222-2222-4222-8222-222222222222",
    });
    const validResult = UpdateSchema.safeParse({
      duration: MeetingDurationSchema.parse(90),
    });

    expect(MeetingUpdateFieldKeys.length).toBeGreaterThan(0);
    expect(emptyResult.success).toBe(false);
    expect(samePeopleResult.success).toBe(false);
    expect(validResult.success).toBe(true);
  });

  it("enforces status-dependent timestamp refinements", () => {
    const StatusSchema = withMeetingStatusRefinement(
      z.object({
        status: z.enum([
          "draft",
          "scheduled",
          "in_progress",
          "adjourned",
          "completed",
          "cancelled",
        ] as const),
        scheduledAt: z.string().nullable().default(null),
        startedAt: z.string().nullable().default(null),
        adjournedAt: z.string().nullable().default(null),
      }),
    );

    expect(StatusSchema.safeParse({ status: "scheduled", scheduledAt: null }).success).toBe(false);
    expect(StatusSchema.safeParse({ status: "in_progress", startedAt: null }).success).toBe(false);
    expect(StatusSchema.safeParse({ status: "adjourned", adjournedAt: null }).success).toBe(false);
    expect(
      StatusSchema.safeParse({
        status: "scheduled",
        scheduledAt: "2026-01-01T10:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("validates meeting number using shared schema", () => {
    expect(MeetingNumberSchema.safeParse("BM-001").success).toBe(true);
    expect(MeetingNumberSchema.safeParse("").success).toBe(false);
  });

  it("enforces lifecycle text refinements", () => {
    const LifecycleSchema = withMeetingLifecycleTextRefinement(
      z.object({
        note: z.string().nullable().optional(),
        reason: z.string().nullable().optional(),
      }),
    );

    expect(LifecycleSchema.safeParse({ note: "" }).success).toBe(false);
    expect(LifecycleSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(LifecycleSchema.safeParse({ note: "Lunch break" }).success).toBe(true);
    expect(LifecycleSchema.safeParse({ reason: "Weather closure" }).success).toBe(true);
  });
});
