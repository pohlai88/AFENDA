import { describe, expect, it } from "vitest";
import {
  CommDocumentEvents,
  DocumentEventTypes,
  COMM_DOCUMENT_ARCHIVED,
  COMM_DOCUMENT_COLLABORATOR_ADDED,
  COMM_DOCUMENT_COLLABORATOR_REMOVED,
  COMM_DOCUMENT_CREATED,
  COMM_DOCUMENT_PUBLISHED,
  COMM_DOCUMENT_UPDATED,
} from "../document.events.js";

describe("document.events – constants", () => {
  it("has the correct event name values", () => {
    expect(COMM_DOCUMENT_CREATED).toBe("COMM.DOCUMENT_CREATED");
    expect(COMM_DOCUMENT_UPDATED).toBe("COMM.DOCUMENT_UPDATED");
    expect(COMM_DOCUMENT_PUBLISHED).toBe("COMM.DOCUMENT_PUBLISHED");
    expect(COMM_DOCUMENT_ARCHIVED).toBe("COMM.DOCUMENT_ARCHIVED");
    expect(COMM_DOCUMENT_COLLABORATOR_ADDED).toBe("COMM.DOCUMENT_COLLABORATOR_ADDED");
    expect(COMM_DOCUMENT_COLLABORATOR_REMOVED).toBe("COMM.DOCUMENT_COLLABORATOR_REMOVED");
  });
});

describe("document.events – CommDocumentEvents registry", () => {
  it("exposes all 6 events", () => {
    expect(Object.keys(CommDocumentEvents)).toHaveLength(6);
    expect(CommDocumentEvents.Created).toBe(COMM_DOCUMENT_CREATED);
    expect(CommDocumentEvents.Updated).toBe(COMM_DOCUMENT_UPDATED);
    expect(CommDocumentEvents.Published).toBe(COMM_DOCUMENT_PUBLISHED);
    expect(CommDocumentEvents.Archived).toBe(COMM_DOCUMENT_ARCHIVED);
    expect(CommDocumentEvents.CollaboratorAdded).toBe(COMM_DOCUMENT_COLLABORATOR_ADDED);
    expect(CommDocumentEvents.CollaboratorRemoved).toBe(COMM_DOCUMENT_COLLABORATOR_REMOVED);
  });

  it("DocumentEventTypes contains all 6 values", () => {
    expect(DocumentEventTypes).toHaveLength(6);
    for (const event of Object.values(CommDocumentEvents)) {
      expect(DocumentEventTypes).toContain(event);
    }
  });
});
