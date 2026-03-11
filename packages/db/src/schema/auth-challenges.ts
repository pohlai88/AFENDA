import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    type: text("type").notNull(), // mfa | invite | reset

    tokenHash: text("token_hash").notNull().unique(),
    tokenHint: text("token_hint"),

    email: text("email"),
    portal: text("portal"),
    callbackUrl: text("callback_url"),

    tenantId: text("tenant_id"),
    tenantSlug: text("tenant_slug"),
    userId: text("user_id"),

    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revoked: boolean("revoked").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashIdx: index("auth_challenges_token_hash_idx").on(table.tokenHash),
    typeIdx: index("auth_challenges_type_idx").on(table.type),
    expiresIdx: index("auth_challenges_expires_at_idx").on(table.expiresAt),
    userIdx: index("auth_challenges_user_id_idx").on(table.userId),
  }),
);
