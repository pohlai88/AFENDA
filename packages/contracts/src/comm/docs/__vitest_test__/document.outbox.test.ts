import { describe, expect, it } from "vitest";
import { CommDocumentEvents } from "../document.events.js";
import { DocumentOutboxRecordSchema } from "../document.outbox.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const DOC_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const RECORD_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-01-02T10:00:00.000Z";

describe("document.outbox – DocumentOutboxRecordSchema", () => {
  it("accepts Created with valid payload", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommDocumentEvents.Created,
      payload: {
        documentId: DOC_ID,
        orgId: ORG_ID,
        title: "My SOP",
        documentType: "sop",
        visibility: "org",
        createdByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects Created with invalid payload", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommDocumentEvents.Created,
      payload: { orgId: ORG_ID },
      createdAt: NOW,
    });
    expect(result.success).toBe(false);
  });

  it("accepts Updated with valid payload", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommDocumentEvents.Updated,
      payload: {
        documentId: DOC_ID,
        orgId: ORG_ID,
        updatedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("accepts Published with valid payload", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommDocumentEvents.Published,
      payload: {
        documentId: DOC_ID,
        orgId: ORG_ID,
        publishedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("accepts Archived with valid payload", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommDocumentEvents.Archived,
      payload: {
        documentId: DOC_ID,
        orgId: ORG_ID,
        archivedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("accepts CollaboratorAdded with valid payload", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommDocumentEvents.CollaboratorAdded,
      payload: {
        documentId: DOC_ID,
        orgId: ORG_ID,
        principalId: PRINCIPAL_ID,
        role: "viewer",
        addedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("accepts CollaboratorRemoved with valid payload", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommDocumentEvents.CollaboratorRemoved,
      payload: {
        documentId: DOC_ID,
        orgId: ORG_ID,
        principalId: PRINCIPAL_ID,
        removedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event name", () => {
    const result = DocumentOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: "COMM.DOCUMENT_UNKNOWN",
      payload: {},
      createdAt: NOW,
    });
    expect(result.success).toBe(false);
  });
});
