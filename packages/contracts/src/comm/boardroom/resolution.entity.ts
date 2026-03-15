/**
 * Board resolution and vote entity schemas.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { nullableDefault } from "./schema.helpers.js";

/** ID brands */
export const BoardResolutionIdSchema = UuidSchema.brand<"BoardResolutionId">();
export const BoardResolutionVoteIdSchema = UuidSchema.brand<"BoardResolutionVoteId">();

/** Status values */
export const ResolutionStatusValues = [
  "proposed",
  "discussed",
  "approved",
  "rejected",
  "deferred",
  "tabled",
] as const;

export type ResolutionStatus = (typeof ResolutionStatusValues)[number];

export const ResolutionStatusSchema = z.enum(ResolutionStatusValues);

/** Vote values */
export const VoteValues = ["for", "against", "abstain"] as const;

export type Vote = (typeof VoteValues)[number];

export const VoteSchema = z.enum(VoteValues);

/** Reusable string schemas */
const ResolutionTitleTextSchema = z.string().trim().min(1).max(500);
const ResolutionDescriptionTextSchema = z.string().trim().max(10_000);

export const BoardResolutionSchema = z.object({
  id: BoardResolutionIdSchema,
  orgId: OrgIdSchema,
  meetingId: BoardMeetingIdSchema,
  title: ResolutionTitleTextSchema,
  description: nullableDefault(ResolutionDescriptionTextSchema),
  status: ResolutionStatusSchema,
  proposedById: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const BoardResolutionVoteSchema = z.object({
  id: BoardResolutionVoteIdSchema,
  orgId: OrgIdSchema,
  resolutionId: BoardResolutionIdSchema,
  principalId: PrincipalIdSchema,
  vote: VoteSchema,
  createdAt: UtcDateTimeSchema,
});

export type BoardResolutionId = z.infer<typeof BoardResolutionIdSchema>;
export type BoardResolution = z.infer<typeof BoardResolutionSchema>;
export type BoardResolutionVoteId = z.infer<typeof BoardResolutionVoteIdSchema>;
export type BoardResolutionVote = z.infer<typeof BoardResolutionVoteSchema>;
