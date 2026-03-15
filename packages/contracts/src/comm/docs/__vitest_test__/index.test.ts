import { describe, expect, it } from "vitest";
import * as docs from "../index.js";

describe("docs/index – barrel completeness", () => {
  it("exports entity schemas", () => {
    expect(docs).toHaveProperty("CommDocumentSchema");
    expect(docs).toHaveProperty("CommDocumentVersionSchema");
    expect(docs).toHaveProperty("CommDocumentCollaboratorSchema");
    expect(docs).toHaveProperty("CommDocumentStatusValues");
    expect(docs).toHaveProperty("CommDocumentTypeValues");
  });

  it("exports command schemas", () => {
    expect(docs).toHaveProperty("CreateCommDocumentCommandSchema");
    expect(docs).toHaveProperty("UpdateCommDocumentCommandSchema");
    expect(docs).toHaveProperty("PublishCommDocumentCommandSchema");
    expect(docs).toHaveProperty("ArchiveCommDocumentCommandSchema");
    expect(docs).toHaveProperty("DeleteCommDocumentCommandSchema");
    expect(docs).toHaveProperty("AddDocumentCollaboratorCommandSchema");
    expect(docs).toHaveProperty("RemoveDocumentCollaboratorCommandSchema");
  });

  it("exports query/response schemas", () => {
    expect(docs).toHaveProperty("GetCommDocumentResponseSchema");
    expect(docs).toHaveProperty("ListCommDocumentsResponseSchema");
    expect(docs).toHaveProperty("SearchCommDocumentsResponseSchema");
  });

  it("exports event constants and registry", () => {
    expect(docs).toHaveProperty("CommDocumentEvents");
    expect(docs).toHaveProperty("DocumentEventTypes");
  });

  it("exports payload schemas", () => {
    expect(docs).toHaveProperty("DocumentCreatedEventSchema");
    expect(docs).toHaveProperty("DocumentPublishedEventSchema");
    expect(docs).toHaveProperty("DocumentCollaboratorAddedEventSchema");
  });

  it("exports outbox schema", () => {
    expect(docs).toHaveProperty("DocumentOutboxRecordSchema");
  });
});
