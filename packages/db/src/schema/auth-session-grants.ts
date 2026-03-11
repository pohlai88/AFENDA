/**
 * AUTH_SESSION_GRANT — short-lived one-time token to establish web session.
 *
 * Issued after successful invite acceptance or MFA verification.
 * Web exchanges grant for session via signIn("afenda-grant", { grant }).
 * Single-use, 5-minute expiry.
 */
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";
import { iamPrincipal } from "./kernel/index";

export const authSessionGrant = pgTable(
  "auth_session_grant",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email").notNull(),
    portal: text("portal").notNull().default("app"),
    expiresAt: tsz("expires_at").notNull(),
    usedAt: tsz("used_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("auth_session_grant_principal_idx").on(t.principalId),
    index("auth_session_grant_token_hash_idx").on(t.tokenHash),
    index("auth_session_grant_expires_idx").on(t.expiresAt),
  ],
);
