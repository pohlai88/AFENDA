/**
 * IAM_PRINCIPAL_MFA — TOTP secrets for two-factor authentication.
 *
 * One row per principal. Secret is base32-encoded TOTP seed.
 * TODO: Encrypt at rest with AUTH_TOTP_ENCRYPTION_KEY.
 */
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";
import { iamPrincipal } from "./kernel/index";

export const iamPrincipalMfa = pgTable(
  "iam_principal_mfa",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    totpSecret: text("totp_secret").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("iam_principal_mfa_principal_idx").on(t.principalId),
    unique("iam_principal_mfa_principal_uidx").on(t.principalId),
  ],
);
