/**
 * Idempotency key primitive.
 *
 * Shared here because every command schema in every domain carries one —
 * this is an infrastructure cross-cut, not a domain primitive.
 *
 * Rules:
 *   1. Always a non-empty trimmed string, max 128 chars (fits HTTP header budget).
 *   2. Callers generate a stable key per logical operation (UUID v4 or
 *      deterministic hash). The API/worker layer deduplicates on this key.
 *   3. The header name is `IdempotencyKeyHeader` from `shared/headers.ts`.
 *      Commands carry the value in the body so workers can access it without
 *      parsing HTTP headers.
 */
import { z } from "zod";

export const IdempotencyKeySchema = z.string().trim().min(1).max(128);

export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
