/**
 * WHT Certificate entity — withholding tax certificates for tax compliance.
 *
 * RULES:
 *   1. WHT certificates are issued when withholding tax is deducted from payments
 *   2. Each certificate has a unique certificate number per jurisdiction
 *   3. Certificates can be linked to specific payments or payment runs
 *   4. Exemptions allow reduced or zero WHT for qualifying suppliers
 */
import { z } from "zod";
import { brandedUuid } from "../../../shared/ids.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { UtcDateTimeSchema, DateSchema } from "../../../shared/datetime.js";

// ── Branded IDs ───────────────────────────────────────────────────────────────

export const WhtCertificateIdSchema = brandedUuid("WhtCertificateId");
export type WhtCertificateId = z.infer<typeof WhtCertificateIdSchema>;

export const WhtExemptionIdSchema = brandedUuid("WhtExemptionId");
export type WhtExemptionId = z.infer<typeof WhtExemptionIdSchema>;

// ── WHT Type values — types of withholding tax ────────────────────────────────

export const WhtTypeValues = [
  "SERVICES",      // Services rendered (consulting, professional fees)
  "RENT",          // Rental payments
  "ROYALTIES",     // Royalty payments
  "INTEREST",      // Interest payments
  "DIVIDENDS",     // Dividend payments
  "OTHER",         // Other taxable payments
] as const;

export type WhtType = (typeof WhtTypeValues)[number];

// ── Certificate status values ─────────────────────────────────────────────────

export const WhtCertificateStatusValues = [
  "DRAFT",        // Being prepared
  "ISSUED",       // Officially issued to supplier
  "SUBMITTED",    // Submitted to tax authority
  "VOIDED",       // Cancelled/reversed
] as const;

export type WhtCertificateStatus = (typeof WhtCertificateStatusValues)[number];

// ── WHT Certificate schema ────────────────────────────────────────────────────

export const WhtCertificateSchema = z.object({
  id: WhtCertificateIdSchema,
  orgId: brandedUuid("OrgId"),
  
  /** The supplier this certificate is for */
  supplierId: brandedUuid("SupplierId"),
  
  /** Official certificate number (unique per jurisdiction/year) */
  certificateNumber: z.string().min(1).max(50),
  
  /** Type of withholding tax */
  whtType: z.enum(WhtTypeValues),
  
  /** Tax jurisdiction code (e.g., "US", "GB", "SG") */
  jurisdictionCode: z.string().min(2).max(10),
  
  /** ISO 4217 currency code */
  currencyCode: CurrencyCodeSchema,
  
  /** Gross payment amount in minor units (before WHT) */
  grossAmountMinor: z.coerce.bigint(),
  
  /** WHT rate applied (e.g., 15 means 15%) */
  whtRatePercent: z.number().min(0).max(100),
  
  /** WHT amount deducted in minor units */
  whtAmountMinor: z.coerce.bigint(),
  
  /** Net payment amount in minor units (after WHT) */
  netAmountMinor: z.coerce.bigint(),
  
  /** Tax period (e.g., "2026-Q1", "2026-03") */
  taxPeriod: z.string().min(1).max(20),
  
  /** Date the certificate covers */
  certificateDate: DateSchema,
  
  /** Payment run this certificate relates to (if applicable) */
  paymentRunId: brandedUuid("PaymentRunId").optional(),
  
  /** Current status */
  status: z.enum(WhtCertificateStatusValues),
  
  /** Date issued to supplier */
  issuedAt: UtcDateTimeSchema.optional(),
  
  /** Date submitted to tax authority */
  submittedAt: UtcDateTimeSchema.optional(),
  
  /** Tax authority reference number (if submitted) */
  taxAuthorityReference: z.string().max(100).optional(),
  
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type WhtCertificate = z.infer<typeof WhtCertificateSchema>;

// ── WHT Exemption schema ──────────────────────────────────────────────────────
// Defines reduced or zero WHT rates for qualifying suppliers

export const WhtExemptionSchema = z.object({
  id: WhtExemptionIdSchema,
  orgId: brandedUuid("OrgId"),
  
  /** The supplier this exemption applies to */
  supplierId: brandedUuid("SupplierId"),
  
  /** Type of WHT this exemption covers */
  whtType: z.enum(WhtTypeValues),
  
  /** Tax jurisdiction for this exemption */
  jurisdictionCode: z.string().min(2).max(10),
  
  /** Reason for exemption */
  exemptionReason: z.string().min(1).max(500),
  
  /** Exemption certificate/document number */
  exemptionDocumentNumber: z.string().max(100).optional(),
  
  /** Reduced rate (0 for full exemption, or reduced rate percentage) */
  reducedRatePercent: z.number().min(0).max(100).default(0),
  
  /** Exemption valid from */
  validFrom: DateSchema,
  
  /** Exemption valid to */
  validTo: DateSchema,
  
  /** Whether this exemption is currently active */
  isActive: z.boolean().default(true),
  
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type WhtExemption = z.infer<typeof WhtExemptionSchema>;
