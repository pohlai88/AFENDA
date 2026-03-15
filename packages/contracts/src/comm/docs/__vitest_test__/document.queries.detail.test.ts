import { describe, expect, it } from "vitest";
import {
  GetCommDocumentResponseSchema,
  ListCommDocumentsResponseSchema,
} from "../document.queries.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const DOC_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const NOW = "2026-01-02T10:00:00.000Z";

const BASE_DOC = {
  id: DOC_ID,
  orgId: ORG_ID,
  documentNumber: "DOC-001",
  title: "Test Document",
  body: "Some meaningful body content.",
  status: "draft",
  documentType: "page",
  visibility: "org",
  createdByPrincipalId: PRINCIPAL_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("document.queries – GetCommDocumentResponseSchema", () => {
  it("accepts a valid detail response", () => {
    const result = GetCommDocumentResponseSchema.safeParse({
      data: BASE_DOC,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.queries – ListCommDocumentsResponseSchema", () => {
  it("accepts an empty list response", () => {
    const result = ListCommDocumentsResponseSchema.safeParse({
      data: [],
      meta: { cursor: null, limit: 50, hasMore: false },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a list with items", () => {
    const result = ListCommDocumentsResponseSchema.safeParse({
      data: [BASE_DOC],
      meta: { cursor: null, limit: 50, hasMore: false },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
