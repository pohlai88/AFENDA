/**
 * EntityDef — metadata describing a registered business entity.
 *
 * RULES:
 *   1. `entityKey` is domain-scoped dot-notation: `"finance.ap_invoice"`.
 *   2. Transport shape only — no React, no Tailwind, no icon imports.
 *   3. `recordTitleTemplate` uses `{fieldKey}` interpolation:
 *      e.g. `"Invoice #{invoiceNumber}"`.
 */
import { z } from "zod";

export const EntityDefSchema = z.object({
  /** Domain-scoped key: `"finance.ap_invoice"`, `"supplier.supplier"` */
  entityKey: z.string().min(1).max(128),

  /** Top-level domain: `"finance"`, `"supplier"`, `"gl"` */
  domainKey: z.string().min(1).max(64),

  /** Human label — singular: `"Invoice"` */
  labelSingular: z.string().min(1).max(128),

  /** Human label — plural: `"Invoices"` */
  labelPlural: z.string().min(1).max(128),

  /** Field key of the primary identifier shown to users: `"invoiceNumber"` */
  primaryFieldKey: z.string().min(1).max(128),

  /**
   * Template for record titles in breadcrumbs, search results, references.
   * Uses `{fieldKey}` interpolation: `"Invoice #{invoiceNumber}"`.
   */
  recordTitleTemplate: z.string().min(1).max(256),
});

export type EntityDef = z.infer<typeof EntityDefSchema>;
