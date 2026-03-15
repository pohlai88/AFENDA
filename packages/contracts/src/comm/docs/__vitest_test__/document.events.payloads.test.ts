import { describe, expect, it } from "vitest";
import {
  DocumentArchivedEventSchema,
  DocumentCollaboratorAddedEventSchema,
  DocumentCollaboratorRemovedEventSchema,
  DocumentCreatedEventSchema,
  DocumentPublishedEventSchema,
  DocumentUpdatedEventSchema,
} from "../document.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const DOC_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("document.events.payloads – DocumentCreatedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = DocumentCreatedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      title: "New Policy",
      documentType: "policy",
      visibility: "org",
      createdByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid documentType", () => {
    const result = DocumentCreatedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      title: "New Policy",
      documentType: "report",
      visibility: "org",
      createdByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("document.events.payloads – DocumentUpdatedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = DocumentUpdatedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      updatedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.events.payloads – DocumentPublishedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = DocumentPublishedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      publishedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.events.payloads – DocumentArchivedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = DocumentArchivedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      archivedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("document.events.payloads – DocumentCollaboratorAddedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = DocumentCollaboratorAddedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      role: "editor",
      addedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = DocumentCollaboratorAddedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      role: "owner",
      addedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("document.events.payloads – DocumentCollaboratorRemovedEventSchema", () => {
  it("accepts valid payload", () => {
    const result = DocumentCollaboratorRemovedEventSchema.safeParse({
      documentId: DOC_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      removedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
