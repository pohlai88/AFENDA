import { describe, expect, it } from "vitest";
import {
  CollaboratorRoleSchema,
  CommDocumentCollaboratorSchema,
  CommDocumentIdSchema,
  CommDocumentSchema,
  CommDocumentStatusValues,
  CommDocumentTypeValues,
  CommDocumentVersionSchema,
  CommDocumentVisibilityValues,
} from "../document.entity.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const DOC_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const VER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const NOW = "2026-01-02T10:00:00.000Z";

const BASE_DOC = {
  id: DOC_ID,
  orgId: ORG_ID,
  documentNumber: "DOC-001",
  title: "Test Doc",
  body: "Some body content that is long enough.",
  status: "draft",
  documentType: "page",
  visibility: "org",
  createdByPrincipalId: PRINCIPAL_ID,
  createdAt: NOW,
  updatedAt: NOW,
} as const;

describe("document.entity – CommDocumentIdSchema", () => {
  it("accepts a valid UUID", () => {
    expect(CommDocumentIdSchema.safeParse(DOC_ID).success).toBe(true);
  });
});

describe("document.entity – CommDocumentSchema", () => {
  it("accepts a valid draft document", () => {
    const result = CommDocumentSchema.safeParse(BASE_DOC);
    expect(result.success).toBe(true);
  });

  it("accepts a published document with required fields", () => {
    const result = CommDocumentSchema.safeParse({
      ...BASE_DOC,
      status: "published",
      publishedAt: NOW,
      publishedByPrincipalId: PRINCIPAL_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects published document missing publishedAt", () => {
    const result = CommDocumentSchema.safeParse({
      ...BASE_DOC,
      status: "published",
      publishedByPrincipalId: PRINCIPAL_ID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects document that is its own parent", () => {
    const result = CommDocumentSchema.safeParse({
      ...BASE_DOC,
      parentDocId: DOC_ID,
    });
    expect(result.success).toBe(false);
  });

  it("has expected status values", () => {
    expect(CommDocumentStatusValues).toContain("draft");
    expect(CommDocumentStatusValues).toContain("published");
    expect(CommDocumentStatusValues).toContain("archived");
  });

  it("has expected type values", () => {
    expect(CommDocumentTypeValues).toContain("page");
    expect(CommDocumentTypeValues).toContain("wiki");
    expect(CommDocumentTypeValues).toContain("sop");
  });

  it("has expected visibility values", () => {
    expect(CommDocumentVisibilityValues).toContain("org");
    expect(CommDocumentVisibilityValues).toContain("team");
    expect(CommDocumentVisibilityValues).toContain("private");
  });
});

describe("document.entity – CommDocumentVersionSchema", () => {
  it("accepts a valid version", () => {
    const result = CommDocumentVersionSchema.safeParse({
      id: VER_ID,
      orgId: ORG_ID,
      documentId: DOC_ID,
      versionNumber: 1,
      title: "Test Doc v1",
      body: "Some body content.",
      createdByPrincipalId: PRINCIPAL_ID,
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.entity – CommDocumentCollaboratorSchema", () => {
  it("accepts a valid collaborator", () => {
    const result = CommDocumentCollaboratorSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      role: "editor",
      addedByPrincipalId: PRINCIPAL_ID,
      addedAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = CollaboratorRoleSchema.safeParse("owner");
    expect(result.success).toBe(false);
  });
});
