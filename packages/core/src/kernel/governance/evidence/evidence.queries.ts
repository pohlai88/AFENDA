/**
 * Evidence read queries — list documents for the org.
 *
 * RULES:
 *   - All queries are org-scoped.
 *   - Cursor pagination via opaque cursor (base64-encoded id).
 *   - Returns plain objects — no class instances.
 */

import type { DbClient } from "@afenda/db";
import { document } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";
import type { CursorPage } from "@afenda/contracts";

export interface DocumentListRow {
  id: string;
  orgId: string;
  objectKey: string;
  mime: string;
  sizeBytes: number;
  originalFileName: string | null;
  uploadedAt: string;
}

export interface ListDocumentsParams {
  cursor?: string;
  limit?: number;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

/**
 * List documents for the org with cursor pagination.
 */
export async function listDocuments(
  db: DbClient,
  orgId: OrgId,
  params: ListDocumentsParams = {},
): Promise<CursorPage<DocumentListRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(document.orgId, orgId)];
  if (params.cursor) {
    conditions.push(gt(document.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select({
      id: document.id,
      orgId: document.orgId,
      objectKey: document.objectKey,
      mime: document.mime,
      sizeBytes: document.sizeBytes,
      originalFileName: document.originalFileName,
      uploadedAt: document.uploadedAt,
    })
    .from(document)
    .where(and(...conditions))
    .orderBy(asc(document.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      objectKey: r.objectKey,
      mime: r.mime,
      sizeBytes: Number(r.sizeBytes),
      originalFileName: r.originalFileName,
      uploadedAt: r.uploadedAt.toISOString(),
    })),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}
