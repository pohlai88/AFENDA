import { describe, expect, it } from "vitest";
import {
  AddDocumentCollaboratorCommandSchema,
  ArchiveCommDocumentCommandSchema,
  CreateCommDocumentCommandSchema,
  DeleteCommDocumentCommandSchema,
  PublishCommDocumentCommandSchema,
  RemoveDocumentCollaboratorCommandSchema,
  UpdateCommDocumentCommandSchema,
} from "../document.commands.js";

const DOC_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const IK = "ik-doc-001";

describe("document.commands – CreateCommDocumentCommandSchema", () => {
  it("accepts minimal valid input", () => {
    const result = CreateCommDocumentCommandSchema.safeParse({
      idempotencyKey: IK,
      title: "New SOP",
      body: "This is the body of the document.",
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const parsed = CreateCommDocumentCommandSchema.parse({
      idempotencyKey: IK,
      title: "My Doc",
      body: "Body text here.",
    });
    expect(parsed.documentType).toBe("page");
    expect(parsed.visibility).toBe("org");
    expect(parsed.slug).toBeNull();
    expect(parsed.parentDocId).toBeNull();
  });

  it("rejects missing title", () => {
    const result = CreateCommDocumentCommandSchema.safeParse({
      idempotencyKey: IK,
      body: "Body text here.",
    });
    expect(result.success).toBe(false);
  });
});

describe("document.commands – UpdateCommDocumentCommandSchema", () => {
  it("accepts update with changed title only", () => {
    const result = UpdateCommDocumentCommandSchema.safeParse({
      idempotencyKey: IK,
      documentId: DOC_ID,
      title: "Updated Title",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when parentDocId equals documentId", () => {
    const result = UpdateCommDocumentCommandSchema.safeParse({
      idempotencyKey: IK,
      documentId: DOC_ID,
      parentDocId: DOC_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("document.commands – PublishCommDocumentCommandSchema", () => {
  it("accepts valid publish command", () => {
    const result = PublishCommDocumentCommandSchema.safeParse({
      idempotencyKey: IK,
      documentId: DOC_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.commands – ArchiveCommDocumentCommandSchema", () => {
  it("accepts valid archive command", () => {
    const result = ArchiveCommDocumentCommandSchema.safeParse({
      idempotencyKey: IK,
      documentId: DOC_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.commands – DeleteCommDocumentCommandSchema", () => {
  it("accepts valid delete command", () => {
    const result = DeleteCommDocumentCommandSchema.safeParse({
      idempotencyKey: IK,
      documentId: DOC_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.commands – collaborative commands", () => {
  it("AddDocumentCollaborator accepts valid input", () => {
    const result = AddDocumentCollaboratorCommandSchema.safeParse({
      idempotencyKey: IK,
      documentId: DOC_ID,
      principalId: PRINCIPAL_ID,
    });
    expect(result.success).toBe(true);
  });

  it("RemoveDocumentCollaborator accepts valid input", () => {
    const result = RemoveDocumentCollaboratorCommandSchema.safeParse({
      idempotencyKey: IK,
      documentId: DOC_ID,
      principalId: PRINCIPAL_ID,
    });
    expect(result.success).toBe(true);
  });
});
