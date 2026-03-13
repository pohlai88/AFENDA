import { z } from "zod";
import {
  AnnouncementAudienceTypeSchema,
  AnnouncementIdSchema,
  AnnouncementReadIdSchema,
  AnnouncementSchema,
  AnnouncementStatusSchema,
} from "./announcement.entity.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
  CommSearchLimitSchema,
} from "../shared/query.js";
import { makeCommListResponseSchema, makeCommSearchResponseSchema } from "../shared/response.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

export const GetAnnouncementQuerySchema = z.object({
  announcementId: AnnouncementIdSchema,
});

export const ListAnnouncementsQuerySchema = z
  .object({
    status: AnnouncementStatusSchema.optional(),
    audienceType: AnnouncementAudienceTypeSchema.optional(),
    publishedBefore: UtcDateTimeSchema.optional(),
    publishedAfter: UtcDateTimeSchema.optional(),
    limit: CommListLimitSchema,
    cursor: AnnouncementIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "publishedAfter",
      toKey: "publishedBefore",
      message: "publishedBefore must be on or after publishedAfter.",
      path: ["publishedBefore"],
    });
  });

export const SearchAnnouncementsQuerySchema = z.object({
  query: CommQueryTextSchema,
  status: AnnouncementStatusSchema.optional(),
  audienceType: AnnouncementAudienceTypeSchema.optional(),
  limit: CommSearchLimitSchema,
});

export const ListAnnouncementReadsQuerySchema = z.object({
  announcementId: AnnouncementIdSchema,
  limit: CommListLimitSchema,
  cursor: AnnouncementReadIdSchema.optional(),
});

export const ListAnnouncementsResponseSchema = makeCommListResponseSchema(AnnouncementSchema);
export const SearchAnnouncementsResponseSchema = makeCommSearchResponseSchema(AnnouncementSchema);

export type GetAnnouncementQuery = z.infer<typeof GetAnnouncementQuerySchema>;
export type ListAnnouncementsQuery = z.infer<typeof ListAnnouncementsQuerySchema>;
export type SearchAnnouncementsQuery = z.infer<typeof SearchAnnouncementsQuerySchema>;
export type ListAnnouncementReadsQuery = z.infer<typeof ListAnnouncementReadsQuerySchema>;
export type ListAnnouncementsResponse = z.infer<typeof ListAnnouncementsResponseSchema>;
export type SearchAnnouncementsResponse = z.infer<typeof SearchAnnouncementsResponseSchema>;
