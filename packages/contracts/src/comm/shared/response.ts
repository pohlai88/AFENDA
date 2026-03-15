import { z } from "zod";
import { CorrelationIdSchema } from "../../shared/ids.js";
import { COMM_LIST_LIMIT_MAX, COMM_SEARCH_LIMIT_MAX, CommQueryTextSchema } from "./query.js";

export const CommCursorMetaSchema = z.object({
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  limit: z.number().int().min(1).max(COMM_LIST_LIMIT_MAX),
});

export const CommSearchMetaSchema = z.object({
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  limit: z.number().int().min(1).max(COMM_SEARCH_LIMIT_MAX),
  query: CommQueryTextSchema,
});

export const CommSummaryGroupSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
});

export const makeCommListResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: CommCursorMetaSchema,
    correlationId: CorrelationIdSchema,
  });

export const makeCommSearchResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: CommSearchMetaSchema,
    correlationId: CorrelationIdSchema,
  });

export const makeCommDetailResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: item,
    correlationId: CorrelationIdSchema,
  });

export const makeCommSummaryResponseSchema = <T extends z.ZodTypeAny>(summary: T) =>
  z.object({
    data: summary,
    correlationId: CorrelationIdSchema,
  });

export type CommCursorMeta = z.infer<typeof CommCursorMetaSchema>;
export type CommSearchMeta = z.infer<typeof CommSearchMetaSchema>;
export type CommSummaryGroup = z.infer<typeof CommSummaryGroupSchema>;
export type CommListResponse<T> = {
  data: T[];
  meta: CommCursorMeta;
  correlationId: string;
};
export type CommSearchResponse<T> = {
  data: T[];
  meta: CommSearchMeta;
  correlationId: string;
};
export type CommDetailResponse<T> = {
  data: T;
  correlationId: string;
};
export type CommSummaryResponse<T> = {
  data: T;
  correlationId: string;
};
