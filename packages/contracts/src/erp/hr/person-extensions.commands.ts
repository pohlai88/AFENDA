import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const AddPersonAddressCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  personId: UuidSchema,
  addressType: z.string().trim().min(1).max(50),
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(120).optional(),
  stateProvince: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  countryCode: z.string().trim().length(3),
  isPrimary: z.boolean().optional(),
});

export const AddEmergencyContactCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  personId: UuidSchema,
  contactName: z.string().trim().min(1).max(255),
  relationship: z.string().trim().max(80).optional(),
  phone: z.string().trim().min(1).max(50),
  email: z.string().email().max(320).optional(),
  isPrimary: z.boolean().optional(),
});

export const AddDependentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  personId: UuidSchema,
  dependentName: z.string().trim().min(1).max(255),
  relationship: z.string().trim().min(1).max(80),
  birthDate: DateSchema.optional(),
});

export const AddEmployeeDocumentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  documentType: z.string().trim().min(1).max(80),
  fileReference: z.string().trim().min(1).max(512),
  issuedAt: DateSchema.optional(),
  expiresAt: DateSchema.optional(),
});

export const AddPersonAddressResultSchema = z.object({
  addressId: UuidSchema,
  personId: UuidSchema,
});

export const AddEmergencyContactResultSchema = z.object({
  contactId: UuidSchema,
  personId: UuidSchema,
});

export const AddDependentResultSchema = z.object({
  dependentId: UuidSchema,
  personId: UuidSchema,
});

export const AddEmployeeDocumentResultSchema = z.object({
  documentId: UuidSchema,
  employmentId: UuidSchema,
});

export type AddPersonAddressCommand = z.infer<typeof AddPersonAddressCommandSchema>;
export type AddEmergencyContactCommand = z.infer<typeof AddEmergencyContactCommandSchema>;
export type AddDependentCommand = z.infer<typeof AddDependentCommandSchema>;
export type AddEmployeeDocumentCommand = z.infer<typeof AddEmployeeDocumentCommandSchema>;
export type AddPersonAddressResult = z.infer<typeof AddPersonAddressResultSchema>;
export type AddEmergencyContactResult = z.infer<typeof AddEmergencyContactResultSchema>;
export type AddDependentResult = z.infer<typeof AddDependentResultSchema>;
export type AddEmployeeDocumentResult = z.infer<typeof AddEmployeeDocumentResultSchema>;
