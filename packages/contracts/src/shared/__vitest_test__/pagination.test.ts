import { describe, expect, it } from "vitest";

import {
  decodeCursor,
  encodeCursor,
  InvalidCursorError,
  OffsetPaginationSchema,
  PaginationSchema,
  paginateArray,
  toLimitOffset,
  type CursorPayload,
} from "../pagination";

type Row = {
  id: string;
  score: number;
};

const rows: Row[] = [
  { id: "a", score: 10 },
  { id: "b", score: 9 },
  { id: "c", score: 8 },
  { id: "d", score: 7 },
];

const toPayload = (r: Row): CursorPayload => ({
  v: 1,
  lastId: r.id,
  lastSortValue: r.score,
});

describe("shared pagination", () => {
  it("round-trips cursor payload encode/decode", () => {
    const payload: CursorPayload = {
      v: 1,
      lastId: "row_42",
      lastSortValue: 123,
    };

    const cursor = encodeCursor(payload);
    const decoded = decodeCursor(cursor);

    expect(decoded).toEqual(payload);
  });

  it("throws InvalidCursorError for invalid base64", () => {
    expect(() => decodeCursor("%%%not-base64url%%%")).toThrowError(InvalidCursorError);
  });

  it("throws InvalidCursorError for invalid JSON payload", () => {
    const badJsonCursor = "bm90LWpzb24";

    expect(() => decodeCursor(badJsonCursor)).toThrowError(InvalidCursorError);
  });

  it("throws InvalidCursorError for schema-invalid payload", () => {
    const badPayloadCursor = "eyJ2IjowfQ";

    expect(() => decodeCursor(badPayloadCursor)).toThrowError(InvalidCursorError);
  });

  it("normalizes empty cursor and numeric-string limit in schema", () => {
    const parsed = PaginationSchema.parse({
      cursor: "",
      limit: "10",
    });

    expect(parsed.cursor).toBeUndefined();
    expect(parsed.limit).toBe(10);
  });

  it("normalizes null-like values in schemas", () => {
    const parsedCursor = PaginationSchema.parse({
      cursor: "null",
      limit: "null",
    });
    const parsedOffset = OffsetPaginationSchema.parse({
      offset: "null",
      limit: "null",
    });

    expect(parsedCursor.cursor).toBeUndefined();
    expect(parsedCursor.limit).toBe(25);
    expect(parsedOffset.offset).toBe(0);
    expect(parsedOffset.limit).toBe(25);
  });

  it("paginates from start when no cursor provided", () => {
    const page = paginateArray(rows, { limit: 2 }, toPayload);

    expect(page.items.map((r) => r.id)).toEqual(["a", "b"]);
    expect(page.meta.nextCursor).toBeTruthy();
    expect(page.meta.prevCursor).toBeNull();
  });

  it("paginates after a valid cursor", () => {
    const startCursor = encodeCursor({ v: 1, lastId: "b", lastSortValue: 9 });
    const page = paginateArray(rows, { limit: 2, cursor: startCursor }, toPayload);

    expect(page.items.map((r) => r.id)).toEqual(["c", "d"]);
    expect(page.meta.nextCursor).toBeNull();
    expect(page.meta.prevCursor).toBeTruthy();
  });

  it("starts from beginning when cursor id is not found", () => {
    const unknownCursor = encodeCursor({ v: 1, lastId: "z", lastSortValue: null });
    const page = paginateArray(rows, { limit: 2, cursor: unknownCursor }, toPayload);

    expect(page.items.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("converts offset params to limit/offset", () => {
    const result = toLimitOffset({
      limit: "15" as unknown as number,
      offset: "3" as unknown as number,
    });

    expect(result).toEqual({ limit: 15, offset: 3 });
  });
});
