import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  attachSchemaVersion,
  makeVersionedCursorSchema,
  parseVersionedCursor,
  parseVersionedPayload,
  registerVersionedSchemas,
  withSchemaVersion,
} from "../schema-versioning";

describe("shared schema versioning", () => {
  const V1 = z.object({ a: z.string() });
  const V2 = z.object({ a: z.string(), b: z.number().optional() });

  it("wraps schemas with explicit version literals", () => {
    const schema = withSchemaVersion(V1, "v1");
    const parsed = schema.parse({ version: "v1", payload: { a: "x" } });
    expect(parsed.version).toBe("v1");
    expect(parsed.payload.a).toBe("x");
  });

  it("attaches schema version to payload", () => {
    const wrapped = attachSchemaVersion({ a: "x" }, "v2");
    expect(wrapped).toEqual({ version: "v2", payload: { a: "x" } });
  });

  it("parses known versioned payloads", () => {
    const schemas = registerVersionedSchemas([
      ["v1", V1],
      ["v2", V2],
    ] as const);

    const parsed = parseVersionedPayload({ version: "v2", payload: { a: "x", b: 1 } }, schemas);
    expect(parsed.version).toBe("v2");
    expect(parsed.payload).toEqual({ a: "x", b: 1 });
  });

  it("fails clearly on unsupported payload version", () => {
    const schemas = registerVersionedSchemas([["v1", V1]] as const);

    expect(() =>
      parseVersionedPayload({ version: "v9", payload: { a: "x" } }, schemas),
    ).toThrowError(/Unsupported schema version: v9/);
  });

  it("fails when payload does not match declared schema version", () => {
    const schemas = registerVersionedSchemas([["v2", V2]] as const);

    expect(() =>
      parseVersionedPayload({ version: "v2", payload: { b: 1 } }, schemas),
    ).toThrowError();
  });

  it("parses versioned cursor payloads", () => {
    const CursorV1 = makeVersionedCursorSchema(
      z.object({ lastId: z.string().optional(), pageSize: z.number().int().positive().optional() }),
      "v1",
    );

    const schemas = registerVersionedSchemas([["v1", CursorV1.shape.payload]] as const);

    const parsed = parseVersionedCursor(
      {
        version: "v1",
        cursor: "opaque-cursor",
        payload: { lastId: "id_1", pageSize: 50 },
      },
      schemas,
    );

    expect(parsed.version).toBe("v1");
    expect(parsed.cursor).toBe("opaque-cursor");
    expect(parsed.payload).toEqual({ lastId: "id_1", pageSize: 50 });
  });

  it("fails clearly on unsupported cursor version", () => {
    const schemas = registerVersionedSchemas([
      ["v1", z.object({ lastId: z.string().optional() })],
    ] as const);

    expect(() =>
      parseVersionedCursor(
        {
          version: "v3",
          cursor: "opaque",
          payload: { lastId: "id_1" },
        },
        schemas,
      ),
    ).toThrowError(/Unsupported cursor version: v3/);
  });

  it("enforces cursor schema invariant when schema is used directly", () => {
    const CursorSchema = makeVersionedCursorSchema(z.null(), "v1");

    expect(() => CursorSchema.parse({ version: "v1", cursor: null, payload: null })).toThrowError(
      /cursor is null and payload is empty/,
    );
  });
});
