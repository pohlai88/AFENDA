import type { DbClient } from "@afenda/db";
import { commDocument, commDocumentCollaborator, commDocumentVersion } from "@afenda/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import type {
  CollaboratorRole,
  CommDocumentId,
  CommDocumentStatus,
  CommDocumentType,
  CommDocumentVisibility,
  CursorPage,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

export interface DocumentRow {
  id: string;
  orgId: string;
  documentNumber: string;
  title: string;
  body: string;
  status: CommDocumentStatus;
  documentType: CommDocumentType;
  visibility: CommDocumentVisibility;
  slug: string | null;
  parentDocId: string | null;
  publishedAt: Date | null;
  publishedByPrincipalId: string | null;
  createdByPrincipalId: string;
  lastEditedByPrincipalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersionRow {
  id: string;
  orgId: string;
  documentId: string;
  versionNumber: number;
  title: string;
  body: string;
  createdByPrincipalId: string;
  createdAt: Date;
}

export interface DocumentListParams {
  cursor?: string;
  limit?: number;
  status?: CommDocumentStatus;
  documentType?: CommDocumentType;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export async function listCommDocuments(
  db: DbClient,
  orgId: OrgId,
  params: DocumentListParams = {},
): Promise<CursorPage<DocumentRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(commDocument.orgId, orgId)];
  if (params.status) {
    conditions.push(eq(commDocument.status, params.status));
  }
  if (params.documentType) {
    conditions.push(eq(commDocument.documentType, params.documentType));
  }
  if (params.cursor) {
    conditions.push(gt(commDocument.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(commDocument)
    .where(and(...conditions))
    .orderBy(desc(commDocument.updatedAt), asc(commDocument.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data as DocumentRow[],
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getDocumentById(
  db: DbClient,
  orgId: OrgId,
  id: CommDocumentId,
): Promise<DocumentRow | null> {
  const [row] = await db
    .select()
    .from(commDocument)
    .where(and(eq(commDocument.orgId, orgId), eq(commDocument.id, id)));
  return (row as DocumentRow) ?? null;
}

export async function listDocumentVersions(
  db: DbClient,
  orgId: OrgId,
  documentId: CommDocumentId,
): Promise<DocumentVersionRow[]> {
  const rows = await db
    .select()
    .from(commDocumentVersion)
    .where(
      and(eq(commDocumentVersion.orgId, orgId), eq(commDocumentVersion.documentId, documentId)),
    )
    .orderBy(desc(commDocumentVersion.versionNumber));

  return rows as DocumentVersionRow[];
}

/** Get document by org + slug. Slug is unique per org. */
export async function getDocumentBySlug(
  db: DbClient,
  orgId: OrgId,
  slug: string,
): Promise<DocumentRow | null> {
  const [row] = await db
    .select()
    .from(commDocument)
    .where(and(eq(commDocument.orgId, orgId), eq(commDocument.slug, slug)));
  return (row as DocumentRow) ?? null;
}

/** List child documents of a parent. */
export async function listChildDocuments(
  db: DbClient,
  orgId: OrgId,
  parentDocId: CommDocumentId,
): Promise<DocumentRow[]> {
  const rows = await db
    .select()
    .from(commDocument)
    .where(and(eq(commDocument.orgId, orgId), eq(commDocument.parentDocId, parentDocId)))
    .orderBy(asc(commDocument.title), asc(commDocument.id));
  return rows as DocumentRow[];
}

/** Breadcrumb path from root to document (root first). */
export async function getDocumentBreadcrumb(
  db: DbClient,
  orgId: OrgId,
  documentId: CommDocumentId,
): Promise<DocumentRow[]> {
  const path: DocumentRow[] = [];
  let currentId: string | null = documentId;

  while (currentId) {
    const [row] = await db
      .select()
      .from(commDocument)
      .where(and(eq(commDocument.orgId, orgId), eq(commDocument.id, currentId)));

    if (!row) break;
    path.unshift(row as DocumentRow);
    currentId = row.parentDocId;
  }

  return path;
}

// ─── Collaborator queries ─────────────────────────────────────────────────────

export interface CollaboratorRow {
  documentId: string;
  orgId: string;
  principalId: string;
  role: CollaboratorRole;
  addedByPrincipalId: string;
  addedAt: Date;
}

export async function listDocumentCollaborators(
  db: DbClient,
  orgId: OrgId,
  documentId: CommDocumentId,
): Promise<CollaboratorRow[]> {
  const rows = await db
    .select()
    .from(commDocumentCollaborator)
    .where(
      and(
        eq(commDocumentCollaborator.orgId, orgId),
        eq(commDocumentCollaborator.documentId, documentId),
      ),
    )
    .orderBy(asc(commDocumentCollaborator.addedAt));

  return rows.map((r) => ({
    documentId: r.documentId,
    orgId: r.orgId,
    principalId: r.principalId,
    role: r.role as CollaboratorRole,
    addedByPrincipalId: r.addedByPrincipalId,
    addedAt: r.addedAt,
  }));
}

export async function findCollaborator(
  db: DbClient,
  documentId: CommDocumentId,
  principalId: PrincipalId,
): Promise<CollaboratorRow | null> {
  const [row] = await db
    .select()
    .from(commDocumentCollaborator)
    .where(
      and(
        eq(commDocumentCollaborator.documentId, documentId),
        eq(commDocumentCollaborator.principalId, principalId),
      ),
    );
  if (!row) return null;
  return {
    documentId: row.documentId,
    orgId: row.orgId,
    principalId: row.principalId,
    role: row.role as CollaboratorRole,
    addedByPrincipalId: row.addedByPrincipalId,
    addedAt: row.addedAt,
  };
}
