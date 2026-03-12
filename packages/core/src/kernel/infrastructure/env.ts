/**
 * Environment validation schemas.
 *
 * Each app (api, worker) calls `validateEnv(schema)` at startup.
 * Fail-fast: if any required var is missing or invalid, the process
 * exits immediately with a descriptive error.
 *
 * Design rules:
 *   - Empty / whitespace-only strings are treated as missing.
 *   - URLs and connection strings are structurally validated.
 *   - Secrets are never logged; use `redactEnv()` for startup output.
 *   - The returned config object is frozen to prevent mutation.
 */

import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Treats empty / whitespace-only strings as missing. */
const nonEmpty = (label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: `${label} must not be empty` });

/** Validates a well-formed URL with an optional scheme constraint. */
const url = (label: string) =>
  z
    .string()
    .min(1)
    .superRefine((s, ctx) => {
      try {
        new URL(s);
      } catch {
        ctx.addIssue({ code: "custom", message: `${label} must be a valid URL` });
      }
    });

/** Validates a PostgreSQL connection string (full URL parse). */
const pgUrl = z
  .string()
  .min(1, "Must not be empty")
  .superRefine((s, ctx) => {
    try {
      const u = new URL(s);
      if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") {
        ctx.addIssue({ code: "custom", message: "Must be a PostgreSQL connection string" });
      }
    } catch {
      ctx.addIssue({ code: "custom", message: "Must be a valid URL" });
    }
  });

/**
 * Parses a comma-separated origin list into `string[]`.
 * Each entry must be an `http:` / `https:` origin (no path/query/hash).
 * `"*"` is accepted as a wildcard.
 */
const origins = z
  .string()
  .transform((s) => s.trim())
  .optional()
  .transform((s) =>
    s
      ? s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [],
  )
  .superRefine((list, ctx) => {
    for (const o of list) {
      if (o === "*") continue;
      try {
        const u = new URL(o);
        if (!["http:", "https:"].includes(u.protocol)) throw new Error();
        if (u.pathname !== "/" || u.search || u.hash) {
          ctx.addIssue({
            code: "custom",
            message: `Origin must not include path/query/hash: ${o}`,
          });
        }
      } catch {
        ctx.addIssue({ code: "custom", message: `Invalid origin: ${o}` });
      }
    }
  });

/** S3 bucket name — at minimum: 3-63 lowercase alphanumeric + dots/hyphens. */
const s3Bucket = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/, {
    message:
      "S3_BUCKET must be a valid bucket name (3-63 lowercase chars, no leading/trailing dot or hyphen)",
  });

// ── Shared ───────────────────────────────────────────────────────────────────

export const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: pgUrl,
});

// ── API ──────────────────────────────────────────────────────────────────────

export const ApiEnvSchema = BaseEnvSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  ALLOWED_ORIGINS: origins,
  AUTH_CHALLENGE_SECRET: nonEmpty("AUTH_CHALLENGE_SECRET").pipe(
    z.string().min(32, "AUTH_CHALLENGE_SECRET must be at least 32 hex chars"),
  ),
  // Neon Auth — managed authentication (identity provider)
  NEON_AUTH_BASE_URL: z.string().url("NEON_AUTH_BASE_URL must be a valid URL").optional(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32, "NEON_AUTH_COOKIE_SECRET must be at least 32 chars").optional(),
  NEON_AUTH_JWKS_URL: z.string().url("NEON_AUTH_JWKS_URL must be a valid URL").optional(),
  NEXT_PUBLIC_NEON_AUTH_URL: z.string().url("NEXT_PUBLIC_NEON_AUTH_URL must be a valid URL").optional().describe("Neon Auth endpoint for client-side SDK"),
  S3_ENDPOINT: url("S3_ENDPOINT"),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: s3Bucket,
  S3_ACCESS_KEY_ID: nonEmpty("S3_ACCESS_KEY_ID"),
  S3_SECRET_ACCESS_KEY: nonEmpty("S3_SECRET_ACCESS_KEY"),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && value.ALLOWED_ORIGINS.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ALLOWED_ORIGINS"],
      message: "ALLOWED_ORIGINS must include at least one origin in production",
    });
  }
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

// ── Worker ───────────────────────────────────────────────────────────────────

export const WorkerEnvSchema = BaseEnvSchema.extend({
  WORKER_DATABASE_URL: pgUrl.optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(5),
});

export type WorkerEnv = z.infer<typeof WorkerEnvSchema>;

/**
 * Resolve the DB URL a worker should connect to.
 * Prefers `WORKER_DATABASE_URL` when set, otherwise falls back to `DATABASE_URL`.
 */
export function resolveWorkerDbUrl(env: WorkerEnv): string {
  return env.WORKER_DATABASE_URL ?? env.DATABASE_URL;
}

// ── Secret redaction ─────────────────────────────────────────────────────────

const SECRET_KEYS: ReadonlySet<string> = new Set([
  "DATABASE_URL",
  "WORKER_DATABASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "NEON_AUTH_JWKS_URL",
  "AUTH_CHALLENGE_SECRET",
  "AUTH_EVIDENCE_SIGNING_SECRET",
  "S3_SECRET_ACCESS_KEY",
  "S3_ACCESS_KEY_ID",
]);

/**
 * Return a shallow copy of the env with secret values replaced by `[REDACTED]`.
 * Safe for logging at startup.
 */
export function redactEnv(env: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(env).map(([k, v]) => [k, SECRET_KEYS.has(k) ? "[REDACTED]" : v]),
  );
}

// ── Validator ────────────────────────────────────────────────────────────────

/**
 * Validate environment variables against a Zod schema.
 * Throws with a descriptive multi-line error on failure.
 * Returns a frozen object to prevent accidental mutation.
 */
export function validateEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: unknown = process.env,
): Readonly<z.infer<T>> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => {
        const path = i.path.join(".");
        const hint =
          i.code === "invalid_type" && (i as { received?: string }).received === "undefined"
            ? " (missing env var)"
            : "";
        return `  • ${path}: ${i.message}${hint}`;
      })
      .join("\n");
    throw new Error(`❌ Environment validation failed:\n${issues}`);
  }
  return Object.freeze(result.data);
}
