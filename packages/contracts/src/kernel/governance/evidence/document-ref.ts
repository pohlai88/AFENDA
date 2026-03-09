/**
 * Document reference — persisted document metadata used by business records.
 *
 * This is the value stored in form state and submitted to the backend.
 * It represents a registered document/evidence record, not a raw browser File.
 *
 * RULES:
 *   - Use for document field kit canonical value
 *   - documentId is the stable server-side identity
 *   - fileName is display-only, never used for storage routing
 */
import { z } from "zod";
import { DocumentIdSchema, PrincipalIdSchema } from "../../../shared/ids.js";

export const DocumentRefSchema = z.object({
  documentId: DocumentIdSchema,
  fileName: z.string().min(1).max(255),
  mime: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  objectKey: z.string().max(1024).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  status: z.enum(["ready", "processing", "failed"]),
  url: z.string().url().optional(),
  uploadedAt: z.string().optional(),
  uploadedByPrincipalId: PrincipalIdSchema.optional(),
});

export type DocumentRef = z.infer<typeof DocumentRefSchema>;
