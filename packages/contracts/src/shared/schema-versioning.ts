import { z } from "zod";

export const VersionedEnvelope = <T extends z.ZodTypeAny, V extends string>(
  payloadSchema: T,
  version: V,
) =>
  z.object({
    version: z.literal(version),
    payload: payloadSchema,
  });

export type VersionedEnvelopeType<T extends z.ZodTypeAny, V extends string> = {
  version: V;
  payload: z.infer<T>;
};

export function withSchemaVersion<T extends z.ZodTypeAny, V extends string>(schema: T, version: V) {
  return VersionedEnvelope(schema, version);
}

export function attachSchemaVersion<T, V extends string>(
  payload: T,
  version: V,
): { version: V; payload: T } {
  return { version, payload };
}

export type VersionedSchemaMap = Record<string, z.ZodTypeAny>;

function unsupportedVersionError(kind: "schema" | "cursor", version: string): z.ZodError {
  const label = kind === "cursor" ? "Unsupported cursor version" : "Unsupported schema version";
  return new z.ZodError([
    {
      code: "custom",
      path: ["version"],
      message: `${label}: ${version}`,
    },
  ]);
}

export function parseVersionedPayload<S extends VersionedSchemaMap>(
  input: unknown,
  schemas: S,
): { version: keyof S; payload: z.infer<S[keyof S]> } {
  const envelopeBase = z.object({
    version: z.string(),
    payload: z.unknown(),
  });

  const parsed = envelopeBase.parse(input);
  const version = parsed.version as string;
  const schema = schemas[version];

  if (!schema) {
    throw unsupportedVersionError("schema", version);
  }

  const payload = schema.parse(parsed.payload) as z.infer<S[keyof S]>;
  return { version: version as keyof S, payload };
}

export function makeVersionedCursorSchema<T extends z.ZodTypeAny, V extends string>(
  cursorPayloadSchema: T,
  version: V,
) {
  return z
    .object({
      version: z.literal(version),
      cursor: z.string().nullable(),
      payload: cursorPayloadSchema,
    })
    .superRefine((value, ctx) => {
      const candidate = value as { cursor?: string | null; payload?: unknown };
      if (candidate.cursor === null && candidate.payload == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cursor"],
          message: "cursor is null and payload is empty",
        });
      }
    });
}

export function parseVersionedCursor<S extends VersionedSchemaMap>(
  input: unknown,
  schemas: S,
): { version: keyof S; cursor: string | null; payload: z.infer<S[keyof S]> } {
  const base = z.object({
    version: z.string(),
    cursor: z.string().nullable(),
    payload: z.unknown(),
  });

  const parsed = base.parse(input);
  const version = parsed.version as string;
  const schema = schemas[version];

  if (!schema) {
    throw unsupportedVersionError("cursor", version);
  }

  const payload = schema.parse(parsed.payload) as z.infer<S[keyof S]>;
  return {
    version: version as keyof S,
    cursor: parsed.cursor,
    payload,
  };
}

export function registerVersionedSchemas<
  const T extends ReadonlyArray<readonly [string, z.ZodTypeAny]>,
>(entries: T): { [K in T[number] as K[0]]: Extract<T[number], readonly [K[0], z.ZodTypeAny]>[1] } {
  const out: Record<string, z.ZodTypeAny> = {};
  for (const [version, schema] of entries) {
    out[version] = schema;
  }
  return out as { [K in T[number] as K[0]]: Extract<T[number], readonly [K[0], z.ZodTypeAny]>[1] };
}

export const SchemaVersioning = {
  VersionedEnvelope,
  withSchemaVersion,
  attachSchemaVersion,
  parseVersionedPayload,
  makeVersionedCursorSchema,
  parseVersionedCursor,
  registerVersionedSchemas,
};

export default SchemaVersioning;
