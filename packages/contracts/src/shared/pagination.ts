/**
 * src/shared/pagination.ts
 *
 * Cursor-first pagination primitives with versioned cursor payload,
 * robust base64url helpers (runtime-detection), and a typed InvalidCursorError.
 *
 * Conventions:
 *  - Cursor payload includes a `v` (version) field to allow safe evolution.
 *  - Cursors are opaque base64url-encoded JSON.
 *  - Limit defaults and max are enforced via zod schemas.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

export const CURSOR_LIMIT_DEFAULT = 25 as const;
export const CURSOR_LIMIT_MAX = 200 as const;

const emptyToUndefined = (v: unknown) => (v === "" || v === "null" || v === null ? undefined : v);

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

/** Pagination request parameters (cursor-style). */
export const PaginationSchema = z.object({
  limit: z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(CURSOR_LIMIT_MAX).optional())
    .default(CURSOR_LIMIT_DEFAULT),
  cursor: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

/** Simple offset/limit request (legacy). */
export const OffsetPaginationSchema = z.object({
  limit: z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(CURSOR_LIMIT_MAX).optional())
    .default(CURSOR_LIMIT_DEFAULT),
  offset: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()).default(0),
});

export type OffsetPaginationParams = z.infer<typeof OffsetPaginationSchema>;

/** Backward-compatible alias for existing call sites. */
export const CursorParamsSchema = PaginationSchema;
export type CursorParams = PaginationParams;

/* -------------------------------------------------------------------------- */
/* Cursor payload (versioned)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Versioned cursor payload.
 * - v: payload version (default 1)
 * - lastId: optional last-seen id (string)
 * - lastSortValue: optional last-seen sort key (string|number|null)
 *
 * Keep this small. If you need larger state, store server-side and encode a short token.
 */
export const CursorPayloadSchema = z.object({
  v: z.number().int().min(1).default(1),
  lastId: z.string().optional(),
  lastSortValue: z.union([z.string(), z.number(), z.null()]).optional(),
});

export type CursorPayload = z.infer<typeof CursorPayloadSchema>;

/* -------------------------------------------------------------------------- */
/* Base64url helpers (runtime-detection)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Feature detection for Node Buffer base64url support.
 * We attempt a harmless call inside a try/catch to detect 'base64url' encoding support.
 */
const hasNodeBufferBase64Url = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const B = (globalThis as any).Buffer;
    if (!B || typeof B.from !== "function") return false;
    // Try a no-op conversion to detect support for 'base64url'
    // Some environments will throw for unknown encodings.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    B.from("", "base64url");
    return true;
  } catch {
    return false;
  }
})();

const hasNodeBuffer = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer;
  return !!B && typeof B.from === "function";
})();

const hasTextEncoder = typeof TextEncoder !== "undefined";
const hasTextDecoder = typeof TextDecoder !== "undefined";

export class InvalidCursorError extends Error {
  public readonly statusCode: number;
  public readonly cause?: unknown;

  constructor(message = "Invalid pagination cursor", cause?: unknown) {
    super(message);
    this.name = "InvalidCursorError";
    this.statusCode = 400;
    this.cause = cause;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, InvalidCursorError.prototype);
  }
}

/** Encode UTF-8 string to base64url. */
function encodeBase64UrlUtf8(input: string): string {
  // Prefer Node Buffer with native base64url encoding when available
  if (hasNodeBufferBase64Url) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).Buffer.from(input, "utf8").toString("base64url");
  }

  // Node Buffer fallback: base64 then transform to base64url
  if (hasNodeBuffer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (globalThis as any).Buffer.from(input, "utf8").toString("base64");
    return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  // Browser path: use TextEncoder + btoa on binary string
  if (hasTextEncoder && typeof globalThis.btoa === "function") {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const base64 = globalThis.btoa(binary);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  throw new Error("No base64 encoder available in this runtime");
}

/** Decode base64url to UTF-8 string. */
function decodeBase64UrlUtf8(input: string): string {
  // Node Buffer with base64url support
  if (hasNodeBufferBase64Url) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).Buffer.from(input, "base64url").toString("utf8");
  }

  // Node Buffer fallback: convert base64url -> base64 then decode
  if (hasNodeBuffer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b64 = (globalThis as any).Buffer.from(input, "base64").toString("utf8");
    // The above line will throw if input is not valid base64; but we need to convert url -> base64 first
    // Safer approach: replace url-safe chars then decode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = input
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(input.length / 4) * 4, "=");
    return (globalThis as any).Buffer.from(normalized, "base64").toString("utf8");
  }

  // Browser path: atob + TextDecoder
  if (typeof globalThis.atob === "function" && hasTextDecoder) {
    const padded = input
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(input.length / 4) * 4, "=");
    const binary = globalThis.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  throw new Error("No base64 decoder available in this runtime");
}

/** Encode a cursor payload to an opaque base64url string. */
export function encodeCursor(payload: CursorPayload): string {
  const parsed = CursorPayloadSchema.parse(payload);
  const json = JSON.stringify(parsed);
  return encodeBase64UrlUtf8(json);
}

/** Decode an opaque cursor string back to a payload. Throws InvalidCursorError on invalid. */
export function decodeCursor(cursor: string | undefined | null): CursorPayload | undefined {
  if (!cursor) return undefined;

  try {
    const json = decodeBase64UrlUtf8(cursor);
    const parsed: unknown = JSON.parse(json);
    return CursorPayloadSchema.parse(parsed);
  } catch (err) {
    // Wrap zod or runtime errors in a typed error for clearer HTTP mapping
    throw new InvalidCursorError("Invalid pagination cursor", err);
  }
}

/* -------------------------------------------------------------------------- */
/* Result types and helpers                                                   */
/* -------------------------------------------------------------------------- */

/** Metadata returned with a page result. */
export type PageMeta = {
  limit: number;
  nextCursor?: string | null;
  prevCursor?: string | null;
};

/** Generic page result shape. */
export type PageResult<T> = {
  items: T[];
  meta: PageMeta;
};

/**
 * Generic cursor-based page response for existing modules.
 */
export interface CursorPage<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

/** Build a PageResult with encoded next/prev cursors. */
export function buildPageResult<T>(
  items: T[],
  limit: number,
  nextPayload?: CursorPayload | null,
  prevPayload?: CursorPayload | null,
): PageResult<T> {
  return {
    items,
    meta: {
      limit,
      nextCursor: nextPayload ? encodeCursor(nextPayload) : null,
      prevCursor: prevPayload ? encodeCursor(prevPayload) : null,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* In-memory pagination utility                                               */
/* -------------------------------------------------------------------------- */

/**
 * Paginate an in-memory array using cursor semantics.
 *
 * - `items` must be pre-sorted by the same key used to create cursors.
 * - `getCursorPayload(item)` should return { v: 1, lastId, lastSortValue } for the item.
 */
export function paginateArray<T>(
  items: T[],
  params: PaginationParams,
  getCursorPayload: (item: T) => CursorPayload,
): PageResult<T> {
  const parsed = PaginationSchema.parse(params);
  const limit = parsed.limit;
  const cursor = decodeCursor(parsed.cursor);

  let startIndex = 0;

  if (cursor) {
    startIndex = items.findIndex((it) => {
      const p = getCursorPayload(it);
      // For v=1 we match by lastId; consumers can implement richer semantics if they use lastSortValue.
      return p.lastId === cursor.lastId;
    });
    if (startIndex === -1) {
      // If cursor not found, treat as start of list (defensive)
      startIndex = 0;
    } else {
      startIndex += 1;
    }
  }

  const slice = items.slice(startIndex, startIndex + limit);
  const nextItem = items[startIndex + limit];
  const prevItem = startIndex > 0 ? items[startIndex - 1] : undefined;

  const nextPayload = nextItem ? getCursorPayload(nextItem) : null;
  const prevPayload = prevItem ? getCursorPayload(prevItem) : null;

  return buildPageResult(slice, limit, nextPayload, prevPayload);
}

/* -------------------------------------------------------------------------- */
/* Offset helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Convert offset params to SQL-friendly limit/offset pair. */
export function toLimitOffset(params: OffsetPaginationParams): { limit: number; offset: number } {
  const parsed = OffsetPaginationSchema.parse(params);
  return { limit: parsed.limit, offset: parsed.offset };
}

/* -------------------------------------------------------------------------- */
/* Exports bundle                                                             */
/* -------------------------------------------------------------------------- */

export const SharedPagination = {
  CURSOR_LIMIT_DEFAULT,
  CURSOR_LIMIT_MAX,
  PaginationSchema,
  CursorParamsSchema,
  OffsetPaginationSchema,
  CursorPayloadSchema,
  InvalidCursorError,
  encodeCursor,
  decodeCursor,
  buildPageResult,
  paginateArray,
  toLimitOffset,
};

export default SharedPagination;
