/**
 * WHT Certificate command schemas for AP domain.
 *
 * Commands:
 *   - CreateWhtCertificate: Generate WHT certificate for payment
 *   - IssueWhtCertificate: Issue certificate to supplier
 *   - SubmitWhtCertificate: Submit to tax authority
 *   - VoidWhtCertificate: Void a certificate
 *   - CreateWhtExemption: Create WHT exemption for supplier
 *   - UpdateWhtExemption: Update exemption details
 *   - DeactivateWhtExemption: Deactivate an exemption
 */
import { z } from "zod";
import { brandedUuid } from "../../../shared/ids.js";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { DateSchema } from "../../../shared/datetime.js";
import {
  WhtCertificateIdSchema,
  WhtExemptionIdSchema,
  WhtTypeValues,
} from "./wht-certificate.entity.js";

// ── Create WHT Certificate command ────────────────────────────────────────────

export const CreateWhtCertificateCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  supplierId: brandedUuid("SupplierId"),
  certificateNumber: z.string().min(1).max(50),
  whtType: z.enum(WhtTypeValues),
  jurisdictionCode: z.string().min(2).max(10),
  currencyCode: CurrencyCodeSchema,
  grossAmountMinor: z.coerce.bigint().positive(),
  whtRatePercent: z.number().min(0).max(100),
  whtAmountMinor: z.coerce.bigint().nonnegative(),
  netAmountMinor: z.coerce.bigint().positive(),
  taxPeriod: z.string().min(1).max(20),
  certificateDate: DateSchema,
  paymentRunId: brandedUuid("PaymentRunId").optional(),
});

export type CreateWhtCertificateCommand = z.infer<typeof CreateWhtCertificateCommandSchema>;

// ── Issue WHT Certificate command ─────────────────────────────────────────────

export const IssueWhtCertificateCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  whtCertificateId: WhtCertificateIdSchema,
});

export type IssueWhtCertificateCommand = z.infer<typeof IssueWhtCertificateCommandSchema>;

// ── Submit WHT Certificate command ────────────────────────────────────────────

export const SubmitWhtCertificateCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  whtCertificateId: WhtCertificateIdSchema,
  taxAuthorityReference: z.string().min(1).max(100).optional(),
});

export type SubmitWhtCertificateCommand = z.infer<typeof SubmitWhtCertificateCommandSchema>;

// ── Void WHT Certificate command ──────────────────────────────────────────────

export const VoidWhtCertificateCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  whtCertificateId: WhtCertificateIdSchema,
  reason: z.string().min(1).max(500),
});

export type VoidWhtCertificateCommand = z.infer<typeof VoidWhtCertificateCommandSchema>;

// ── Create WHT Exemption command ──────────────────────────────────────────────

export const CreateWhtExemptionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  supplierId: brandedUuid("SupplierId"),
  whtType: z.enum(WhtTypeValues),
  jurisdictionCode: z.string().min(2).max(10),
  exemptionReason: z.string().min(1).max(500),
  exemptionDocumentNumber: z.string().max(100).optional(),
  reducedRatePercent: z.number().min(0).max(100).default(0),
  validFrom: DateSchema,
  validTo: DateSchema,
});

export type CreateWhtExemptionCommand = z.infer<typeof CreateWhtExemptionCommandSchema>;

// ── Update WHT Exemption command ──────────────────────────────────────────────

export const UpdateWhtExemptionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  whtExemptionId: WhtExemptionIdSchema,
  exemptionReason: z.string().min(1).max(500).optional(),
  exemptionDocumentNumber: z.string().max(100).optional(),
  reducedRatePercent: z.number().min(0).max(100).optional(),
  validTo: DateSchema.optional(),
});

export type UpdateWhtExemptionCommand = z.infer<typeof UpdateWhtExemptionCommandSchema>;

// ── Deactivate WHT Exemption command ──────────────────────────────────────────

export const DeactivateWhtExemptionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  whtExemptionId: WhtExemptionIdSchema,
  reason: z.string().min(1).max(500).optional(),
});

export type DeactivateWhtExemptionCommand = z.infer<typeof DeactivateWhtExemptionCommandSchema>;
