import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CommDocumentId,
  CorrelationId,
  OrgId,
  PrincipalId,
  CreateCommDocumentCommand,
  UpdateCommDocumentCommand,
  PublishCommDocumentCommand,
  ArchiveCommDocumentCommand,
} from "@afenda/contracts";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc" as CorrelationId;
const DOCUMENT_ID = "11111111-1111-4111-8111-111111111111" as CommDocumentId;

let selectRows: Array<Record<string, unknown>> = [];
let insertedRecords: Array<{ table: string; values: unknown }> = [];

const documentReturning = {
  id: DOCUMENT_ID,
  documentNumber: "DOC-TEST001",
};

const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockImplementation(async () => selectRows),
  }),
});

const mockInsert = vi.fn().mockImplementation((table: { __table?: string }) => {
  if (table.__table === "comm_document") {
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([documentReturning]),
      }),
    };
  }

  if (table.__table === "comm_document_version" || table.__table === "outboxEvent") {
    return {
      values: vi.fn().mockImplementation(async (values: unknown) => {
        insertedRecords.push({ table: table.__table ?? "unknown", values });
        return undefined;
      }),
    };
  }

  return {
    values: vi.fn().mockImplementation(async (values: unknown) => {
      insertedRecords.push({ table: table.__table ?? "unknown", values });
      return undefined;
    }),
  };
});

const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: DOCUMENT_ID }]),
    }),
  }),
});

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock("@afenda/db", () => ({
  commDocument: { __table: "comm_document", id: "id", orgId: "orgId", slug: "slug" },
  commDocumentVersion: { __table: "comm_document_version" },
  outboxEvent: { __table: "outboxEvent" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((field, value) => ({ field, value })),
  sql: vi.fn((parts: TemplateStringsArray) => ({ sql: parts[0] })),
}));

vi.mock("../../../kernel/governance/audit/audit.js", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _audit: unknown, fn: (tx: unknown) => unknown) =>
      fn(mockTx),
  ),
}));

import {
  createDocument,
  updateDocument,
  publishDocument,
  archiveDocument,
} from "../document.service.js";

function makeCtx() {
  return { activeContext: { orgId: ORG_ID } };
}

describe("document.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectRows = [];
    insertedRecords = [];
  });

  it("returns IAM_PRINCIPAL_NOT_FOUND when creating document without principal", async () => {
    const command: CreateCommDocumentCommand = {
      idempotencyKey: "idem-1",
      title: "Policy",
      body: "Body",
    };

    const result = await createDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: null },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("IAM_PRINCIPAL_NOT_FOUND");
    }
  });

  it("returns COMM_DOCUMENT_PARENT_NOT_FOUND when parent does not exist", async () => {
    selectRows = [];

    const command: CreateCommDocumentCommand = {
      idempotencyKey: "idem-2",
      title: "Child doc",
      body: "Body",
      parentDocId: "00000000-0000-0000-0000-000000000099" as CommDocumentId,
    };

    const result = await createDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_PARENT_NOT_FOUND");
    }
  });

  it("returns COMM_DOCUMENT_SLUG_TAKEN when slug is already in use", async () => {
    selectRows = [{ id: "existing-id", orgId: ORG_ID, slug: "my-slug" }];

    const command: CreateCommDocumentCommand = {
      idempotencyKey: "idem-3",
      title: "Doc",
      body: "Body",
      slug: "my-slug",
    };

    const result = await createDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_SLUG_TAKEN");
    }
  });

  it("creates document and emits COMM_DOCUMENT_CREATED outbox event", async () => {
    selectRows = [];

    const command: CreateCommDocumentCommand = {
      idempotencyKey: "idem-4",
      title: "New doc",
      body: "Content",
    };

    const result = await createDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(DOCUMENT_ID);
      expect(result.data.documentNumber).toBeDefined();
    }

    expect(insertedRecords).toContainEqual(
      expect.objectContaining({
        table: "outboxEvent",
        values: expect.objectContaining({ type: "COMM.DOCUMENT_CREATED" }),
      }),
    );
  });

  it("returns COMM_DOCUMENT_NOT_FOUND for publish when document is missing", async () => {
    selectRows = [];

    const command: PublishCommDocumentCommand = {
      idempotencyKey: "idem-5",
      documentId: DOCUMENT_ID,
    };

    const result = await publishDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_NOT_FOUND");
    }
  });

  it("returns COMM_DOCUMENT_ALREADY_PUBLISHED when document is already published", async () => {
    selectRows = [
      {
        id: DOCUMENT_ID,
        orgId: ORG_ID,
        documentNumber: "DOC-TEST002",
        title: "Published doc",
        status: "published",
      },
    ];

    const command: PublishCommDocumentCommand = {
      idempotencyKey: "idem-6",
      documentId: DOCUMENT_ID,
    };

    const result = await publishDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_ALREADY_PUBLISHED");
    }
  });

  it("returns COMM_DOCUMENT_ALREADY_ARCHIVED when publishing archived document", async () => {
    selectRows = [
      {
        id: DOCUMENT_ID,
        orgId: ORG_ID,
        documentNumber: "DOC-TEST003",
        title: "Archived doc",
        status: "archived",
      },
    ];

    const command: PublishCommDocumentCommand = {
      idempotencyKey: "idem-7",
      documentId: DOCUMENT_ID,
    };

    const result = await publishDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_ALREADY_ARCHIVED");
    }
  });

  it("returns COMM_DOCUMENT_NOT_FOUND for update when document is missing", async () => {
    selectRows = [];

    const command: UpdateCommDocumentCommand = {
      idempotencyKey: "idem-8",
      documentId: DOCUMENT_ID,
      title: "Updated",
      body: "Body",
    };

    const result = await updateDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_NOT_FOUND");
    }
  });

  it("returns COMM_DOCUMENT_ALREADY_ARCHIVED when updating archived document", async () => {
    selectRows = [
      {
        id: DOCUMENT_ID,
        orgId: ORG_ID,
        documentNumber: "DOC-TEST004",
        title: "Archived",
        status: "archived",
      },
    ];

    const command: UpdateCommDocumentCommand = {
      idempotencyKey: "idem-9",
      documentId: DOCUMENT_ID,
      title: "Updated",
      body: "Body",
    };

    const result = await updateDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_ALREADY_ARCHIVED");
    }
  });

  it("returns COMM_DOCUMENT_ALREADY_ARCHIVED when archiving already archived document", async () => {
    selectRows = [
      {
        id: DOCUMENT_ID,
        orgId: ORG_ID,
        documentNumber: "DOC-TEST005",
        title: "Archived",
        status: "archived",
      },
    ];

    const command: ArchiveCommDocumentCommand = {
      idempotencyKey: "idem-10",
      documentId: DOCUMENT_ID,
    };

    const result = await archiveDocument(
      mockDb as never,
      makeCtx() as never,
      { principalId: PRINCIPAL_ID },
      CORRELATION_ID,
      command,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("COMM_DOCUMENT_ALREADY_ARCHIVED");
    }
  });
});
