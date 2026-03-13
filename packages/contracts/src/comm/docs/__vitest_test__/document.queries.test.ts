import { describe, expect, it } from "vitest";
import {
  ListCommDocumentCollaboratorsQuerySchema,
  ListCommDocumentsQuerySchema,
  SearchCommDocumentsQuerySchema,
} from "../document.queries.js";

describe("document.queries", () => {
  it("rejects list query when updatedBefore is earlier than updatedAfter", () => {
    const result = ListCommDocumentsQuerySchema.safeParse({
      updatedAfter: "2026-03-15",
      updatedBefore: "2026-03-01",
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("applies default search limit", () => {
    const parsed = SearchCommDocumentsQuerySchema.parse({
      query: "policy handbook",
    });

    expect(parsed.limit).toBe(20);
  });

  it("accepts collaborator query with default list limit", () => {
    const parsed = ListCommDocumentCollaboratorsQuerySchema.parse({
      documentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(parsed.limit).toBe(50);
  });
});
