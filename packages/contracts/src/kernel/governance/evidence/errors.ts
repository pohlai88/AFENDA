/**
 * Governance evidence/documentation error codes.
 *
 * RULES:
 *   1. All codes prefixed with DOC_ (evidence documents)
 *   2. Naming convention: DOC_NOUN_REASON (SCREAMING_SNAKE_CASE)
 *   3. Removing or renaming a code is a BREAKING CHANGE
 */
import { z } from "zod";

// ─── Evidence Document Error Codes ────────────────────────────────────────────
export const DOC_DOCUMENT_NOT_FOUND = "DOC_DOCUMENT_NOT_FOUND" as const;
export const DOC_DOCUMENT_ALREADY_VERIFIED = "DOC_DOCUMENT_ALREADY_VERIFIED" as const;
export const DOC_DOCUMENT_ALREADY_ATTACHED = "DOC_DOCUMENT_ALREADY_ATTACHED" as const;
export const DOC_DOCUMENT_VIRUS_DETECTED = "DOC_DOCUMENT_VIRUS_DETECTED" as const;
export const DOC_DOCUMENT_EXPIRED = "DOC_DOCUMENT_EXPIRED" as const;
export const DOC_MIME_NOT_ALLOWED = "DOC_MIME_NOT_ALLOWED" as const;
export const DOC_FILE_TOO_LARGE = "DOC_FILE_TOO_LARGE" as const;

// ─── Evidence Document Error Code Array ───────────────────────────────────────
export const EvidenceErrorCodeValues = [
  DOC_DOCUMENT_NOT_FOUND,
  DOC_DOCUMENT_ALREADY_VERIFIED,
  DOC_DOCUMENT_ALREADY_ATTACHED,
  DOC_DOCUMENT_VIRUS_DETECTED,
  DOC_DOCUMENT_EXPIRED,
  DOC_MIME_NOT_ALLOWED,
  DOC_FILE_TOO_LARGE,
] as const;

export const EvidenceErrorCodeSchema = z.enum(EvidenceErrorCodeValues);
export type EvidenceErrorCode = z.infer<typeof EvidenceErrorCodeSchema>;
