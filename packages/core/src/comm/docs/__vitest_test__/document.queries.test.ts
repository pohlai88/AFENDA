import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommDocumentId, OrgId } from "@afenda/contracts";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const DOCUMENT_ID = "11111111-1111-4111-8111-111111111111" as CommDocumentId;
const PARENT_ID = "22222222-2222-4222-8222-222222222222" as CommDocumentId;

let documentRows: Array<Record<string, unknown>> = [];
let versionRows: Array<Record<string, unknown>> = [];

function makeOrderByThenable(rows: Array<Record<string, unknown>>) {
  const ret = {
    limit: vi.fn().mockResolvedValue(rows),
  };
  (ret as { then?: (cb: (v: unknown) => unknown) => Promise<unknown> }).then = (cb) =>
    Promise.resolve(rows).then(cb);
  return ret;
}

function makeWhereForDocument() {
  const orderByRet = makeOrderByThenable(documentRows);
  const r = {
    orderBy: vi.fn().mockReturnValue(orderByRet),
  };
  (r as { then?: (cb: (v: unknown) => unknown) => Promise<unknown> }).then = (cb) =>
    Promise.resolve(documentRows).then(cb);
  return r;
}

const mockSelect = vi.fn().mockImplementation(() => ({
  from: vi.fn().mockImplementation((table: { __table?: string }) => {
    if (table.__table === "comm_document") {
      return { where: vi.fn().mockReturnValue(makeWhereForDocument()) };
    }
    if (table.__table === "comm_document_version") {
      return {
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(versionRows),
        }),
      };
    }
    const emptyOrderBy = makeOrderByThenable([]);
    const emptyWhere = {
      orderBy: vi.fn().mockReturnValue(emptyOrderBy),
    };
    (emptyWhere as { then?: (cb: (v: unknown) => unknown) => Promise<unknown> }).then = (cb) =>
      Promise.resolve([]).then(cb);
    return { where: vi.fn().mockReturnValue(emptyWhere) };
  }),
}));

const mockDb = {
  select: mockSelect,
};

vi.mock("@afenda/db", () => ({
  commDocument: {
    __table: "comm_document",
    id: "id",
    orgId: "orgId",
    slug: "slug",
    parentDocId: "parentDocId",
    updatedAt: "updatedAt",
    title: "title",
  },
  commDocumentVersion: {
    __table: "comm_document_version",
    documentId: "documentId",
    versionNumber: "versionNumber",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  asc: vi.fn((field) => field),
  desc: vi.fn((field) => field),
  eq: vi.fn((field, value) => ({ field, value })),
  gt: vi.fn((field, value) => ({ field, value })),
}));

import {
  getDocumentById,
  getDocumentBySlug,
  listChildDocuments,
  getDocumentBreadcrumb,
  listCommDocuments,
  listDocumentVersions,
} from "../document.queries.js";

describe("document.queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentRows = [];
    versionRows = [];
  });

  it("getDocumentById returns null when document does not exist", async () => {
    documentRows = [];

    const result = await getDocumentById(mockDb as never, ORG_ID, DOCUMENT_ID);

    expect(result).toBeNull();
  });

  it("getDocumentById returns document when it exists", async () => {
    documentRows = [
      {
        id: DOCUMENT_ID,
        orgId: ORG_ID,
        documentNumber: "DOC-001",
        title: "Test doc",
        body: "Body",
        status: "draft",
        documentType: "page",
        visibility: "org",
        slug: "test-doc",
        parentDocId: null,
        publishedAt: null,
        publishedByPrincipalId: null,
        createdByPrincipalId: "creator-id",
        lastEditedByPrincipalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = await getDocumentById(mockDb as never, ORG_ID, DOCUMENT_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(DOCUMENT_ID);
    expect(result?.title).toBe("Test doc");
    expect(result?.slug).toBe("test-doc");
  });

  it("getDocumentBySlug returns null when slug does not exist", async () => {
    documentRows = [];

    const result = await getDocumentBySlug(mockDb as never, ORG_ID, "missing-slug");

    expect(result).toBeNull();
  });

  it("getDocumentBySlug returns document when slug exists", async () => {
    documentRows = [
      {
        id: DOCUMENT_ID,
        orgId: ORG_ID,
        documentNumber: "DOC-002",
        title: "Slug doc",
        body: "Body",
        status: "published",
        documentType: "wiki",
        visibility: "org",
        slug: "my-wiki",
        parentDocId: null,
        publishedAt: new Date(),
        publishedByPrincipalId: "pub-id",
        createdByPrincipalId: "creator-id",
        lastEditedByPrincipalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = await getDocumentBySlug(mockDb as never, ORG_ID, "my-wiki");

    expect(result).not.toBeNull();
    expect(result?.slug).toBe("my-wiki");
    expect(result?.documentType).toBe("wiki");
  });

  it("listChildDocuments returns empty array when no children", async () => {
    documentRows = [];

    const result = await listChildDocuments(mockDb as never, ORG_ID, PARENT_ID);

    expect(result).toEqual([]);
  });

  it("listChildDocuments returns child documents", async () => {
    documentRows = [
      {
        id: "child-1",
        orgId: ORG_ID,
        title: "Child A",
        parentDocId: PARENT_ID,
      },
      {
        id: "child-2",
        orgId: ORG_ID,
        title: "Child B",
        parentDocId: PARENT_ID,
      },
    ];

    const result = await listChildDocuments(mockDb as never, ORG_ID, PARENT_ID);

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("Child A");
    expect(result[1]?.title).toBe("Child B");
  });

  it("getDocumentBreadcrumb returns path from root to document", async () => {
    const rootDoc = {
      id: "root-id",
      orgId: ORG_ID,
      title: "Root",
      parentDocId: null,
    };
    const midDoc = {
      id: PARENT_ID,
      orgId: ORG_ID,
      title: "Mid",
      parentDocId: "root-id",
    };
    const leafDoc = {
      id: DOCUMENT_ID,
      orgId: ORG_ID,
      title: "Leaf",
      parentDocId: PARENT_ID,
    };

    let callCount = 0;
    const breadcrumbSelect = vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) return [leafDoc];
          if (callCount === 2) return [midDoc];
          if (callCount === 3) return [rootDoc];
          return [];
        }),
      }),
    }));

    const result = await getDocumentBreadcrumb(
      { select: breadcrumbSelect } as never,
      ORG_ID,
      DOCUMENT_ID,
    );

    expect(result).toHaveLength(3);
    expect(result[0]?.title).toBe("Root");
    expect(result[1]?.title).toBe("Mid");
    expect(result[2]?.title).toBe("Leaf");
  });

  it("listCommDocuments returns paginated results", async () => {
    documentRows = [
      { id: "doc-1", orgId: ORG_ID, title: "Doc 1", updatedAt: new Date() },
      { id: "doc-2", orgId: ORG_ID, title: "Doc 2", updatedAt: new Date() },
    ];

    const result = await listCommDocuments(mockDb as never, ORG_ID, { limit: 10 });

    expect(result.data).toBeDefined();
    expect(result.cursor).toBeDefined();
    expect(result.hasMore).toBeDefined();
  });

  it("listDocumentVersions returns version history", async () => {
    versionRows = [
      { id: "v1", documentId: DOCUMENT_ID, versionNumber: 2, title: "v2" },
      { id: "v2", documentId: DOCUMENT_ID, versionNumber: 1, title: "v1" },
    ];

    const result = await listDocumentVersions(mockDb as never, ORG_ID, DOCUMENT_ID);

    expect(result).toHaveLength(2);
    expect(result[0]?.versionNumber).toBe(2);
    expect(result[1]?.versionNumber).toBe(1);
  });
});
