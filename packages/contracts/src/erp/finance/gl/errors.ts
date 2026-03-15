/**
 * GL (General Ledger) error codes.
 *
 * RULES:
 *   1. All codes prefixed with GL_
 *   2. Naming convention: GL_NOUN_REASON (SCREAMING_SNAKE_CASE)
 *   3. Removing or renaming a code is a BREAKING CHANGE
 */
import { z } from "zod";

// ─── GL Error Codes ───────────────────────────────────────────────────────────
export const GL_JOURNAL_UNBALANCED = "GL_JOURNAL_UNBALANCED" as const;
export const GL_ACCOUNT_NOT_FOUND = "GL_ACCOUNT_NOT_FOUND" as const;
export const GL_ACCOUNT_INACTIVE = "GL_ACCOUNT_INACTIVE" as const;

// ─── GL Error Code Array ──────────────────────────────────────────────────────
export const GlErrorCodeValues = [
  GL_JOURNAL_UNBALANCED,
  GL_ACCOUNT_NOT_FOUND,
  GL_ACCOUNT_INACTIVE,
] as const;

export const GlErrorCodeSchema = z.enum(GlErrorCodeValues);
export type GlErrorCode = z.infer<typeof GlErrorCodeSchema>;
