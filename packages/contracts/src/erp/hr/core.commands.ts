import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";
import { HrmEmploymentTypeSchema, HrmWorkerTypeSchema } from "./core.entity.js";

const HrCodeSchema = z.string().trim().min(1).max(50);
const HrNameSchema = z.string().trim().min(1).max(255);
const HrOptionalNameSchema = z.string().trim().max(255).optional();
const HrShortCodeSchema = z.string().trim().max(50).optional();

export const CreateHrmPersonCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  personCode: HrCodeSchema.optional(),
  legalName: HrNameSchema,
  preferredName: HrOptionalNameSchema,
  firstName: z.string().trim().min(1).max(120),
  middleName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().min(1).max(120),
  displayName: HrOptionalNameSchema,
  birthDate: DateSchema.optional(),
  genderCode: HrShortCodeSchema,
  maritalStatusCode: HrShortCodeSchema,
  nationalityCountryCode: z.string().trim().length(3).optional(),
  personalEmail: z.string().email().max(320).optional(),
  mobilePhone: z.string().trim().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AssignWorkToPersonCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  effectiveFrom: z.string().min(1),
  legalEntityId: UuidSchema,
  businessUnitId: UuidSchema.optional(),
  departmentId: UuidSchema.optional(),
  costCenterId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  positionId: UuidSchema.optional(),
  jobId: UuidSchema.optional(),
  gradeId: UuidSchema.optional(),
  managerEmployeeId: UuidSchema.optional(),
  workScheduleId: UuidSchema.optional(),
  employmentClass: z.string().trim().max(50).optional(),
  fteRatio: z.string().trim().max(20).optional(),
  changeReason: z.string().trim().min(1).max(120).optional(),
});

export const HireEmployeeCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  personId: UuidSchema,
  employeeCode: HrCodeSchema.optional(),
  workerType: HrmWorkerTypeSchema,
  legalEntityId: UuidSchema,
  employmentType: HrmEmploymentTypeSchema,
  hireDate: DateSchema,
  startDate: DateSchema,
  probationEndDate: DateSchema.optional(),
  businessUnitId: UuidSchema.optional(),
  departmentId: UuidSchema.optional(),
  costCenterId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  positionId: UuidSchema.optional(),
  jobId: UuidSchema.optional(),
  gradeId: UuidSchema.optional(),
  managerEmployeeId: UuidSchema.optional(),
  workScheduleId: UuidSchema.optional(),
  employmentClass: z.string().trim().max(50).optional(),
  fteRatio: z.string().trim().max(20).optional(),
  contract: z
    .object({
      contractNumber: z.string().trim().max(80).optional(),
      contractType: z.string().trim().max(50),
      contractStartDate: z.string().min(1),
      contractEndDate: z.string().min(1).optional(),
      documentFileId: UuidSchema.optional(),
    })
    .optional(),
  onboarding: z
    .object({
      templateId: UuidSchema.optional(),
      startDate: z.string().min(1).optional(),
      autoGenerate: z.boolean().optional(),
    })
    .optional(),
});

export const TransferEmployeeCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  effectiveFrom: z.string().min(1),
  legalEntityId: UuidSchema,
  businessUnitId: UuidSchema.optional(),
  departmentId: UuidSchema.optional(),
  costCenterId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  positionId: UuidSchema.optional(),
  jobId: UuidSchema.optional(),
  gradeId: UuidSchema.optional(),
  managerEmployeeId: UuidSchema.optional(),
  workScheduleId: UuidSchema.optional(),
  employmentClass: z.string().trim().max(50).optional(),
  fteRatio: z.string().trim().max(20).optional(),
  changeReason: z.string().trim().min(1).max(120),
});

export const PromoteEmployeeCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  effectiveFrom: z.string().min(1),
  gradeId: UuidSchema.optional(),
  positionId: UuidSchema.optional(),
  jobId: UuidSchema.optional(),
  promotionType: z.enum(["merit", "acting", "temporary", "career-path"]).optional(),
  changeReason: z.string().trim().min(1).max(120),
});

export const AddEmploymentContractCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    employmentId: UuidSchema,
    contractNumber: z.string().trim().min(1).max(80),
    contractType: z.string().trim().min(1).max(50),
    contractStartDate: DateSchema,
    contractEndDate: DateSchema.optional(),
    documentFileId: UuidSchema.optional(),
  })
  .refine(
    (data) =>
      !data.contractEndDate || data.contractEndDate >= data.contractStartDate,
    { message: "contractEndDate must be >= contractStartDate", path: ["contractEndDate"] },
  );

export const TerminateEmploymentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  terminationDate: DateSchema,
  terminationReasonCode: z.string().trim().min(1).max(50),
  comment: z.string().trim().max(1000).optional(),
  startSeparationCase: z.boolean().optional(),
});

export const SuspendEmploymentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  effectiveDate: DateSchema,
  reasonCode: z.string().trim().min(1).max(50),
  comment: z.string().trim().max(1000).optional(),
});

export const ResumeEmploymentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  effectiveDate: DateSchema,
  comment: z.string().trim().max(1000).optional(),
});

const FteRatioSchema = z
  .string()
  .trim()
  .max(20)
  .refine(
    (s) => {
      const n = parseFloat(s);
      return !Number.isNaN(n) && n >= 0.0001 && n <= 1.0;
    },
    { message: "fteRatio must be between 0.0001 and 1.0000" },
  );

export const ChangeEmploymentTermsCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    employmentId: UuidSchema,
    effectiveFrom: z.string().min(1),
    changeReason: z.string().trim().max(120).optional(),
    fteRatio: FteRatioSchema.optional(),
    probationEndDate: DateSchema.optional(),
    employmentType: HrmEmploymentTypeSchema.optional(),
    contract: z
      .object({
        contractNumber: z.string().trim().min(1).max(80),
        contractType: z.string().trim().min(1).max(50),
        contractStartDate: z.string().min(1),
        contractEndDate: z.string().min(1).optional(),
        documentFileId: UuidSchema.optional(),
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.fteRatio !== undefined ||
      data.probationEndDate !== undefined ||
      data.employmentType !== undefined,
    { message: "At least one of fteRatio, probationEndDate, or employmentType is required" },
  )
  .refine(
    (data) =>
      !data.probationEndDate ||
      !data.effectiveFrom ||
      data.probationEndDate >= data.effectiveFrom,
    { message: "probationEndDate must be >= effectiveFrom", path: ["probationEndDate"] },
  )
  .refine(
    (data) => data.employmentType !== "contract" || (data.contract != null),
    { message: "contract is required when employmentType is 'contract'", path: ["contract"] },
  );

export const RecordPersonIdentityCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  personId: UuidSchema,
  identityType: z.string().trim().min(1).max(50),
  identityNumber: z.string().trim().min(1).max(120),
  issuingCountryCode: z.string().trim().length(3).optional(),
  issuedAt: DateSchema.optional(),
  expiresAt: DateSchema.optional(),
  isPrimary: z.boolean().optional(),
  verificationStatus: z.string().trim().max(50).optional(),
});

export const RehireEmployeeCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employeeId: UuidSchema,
  legalEntityId: UuidSchema,
  employmentType: HrmEmploymentTypeSchema,
  hireDate: DateSchema,
  startDate: DateSchema,
  probationEndDate: DateSchema.optional(),
  businessUnitId: UuidSchema.optional(),
  departmentId: UuidSchema.optional(),
  costCenterId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  positionId: UuidSchema.optional(),
  jobId: UuidSchema.optional(),
  gradeId: UuidSchema.optional(),
  managerEmployeeId: UuidSchema.optional(),
  workScheduleId: UuidSchema.optional(),
  employmentClass: z.string().trim().max(50).optional(),
  fteRatio: z.string().trim().max(20).optional(),
  changeReason: z.string().trim().max(120).optional(),
  contract: z
    .object({
      contractNumber: z.string().trim().max(80).optional(),
      contractType: z.string().trim().max(50),
      contractStartDate: z.string().min(1),
      contractEndDate: z.string().min(1).optional(),
      documentFileId: UuidSchema.optional(),
    })
    .optional(),
});

export const CreateHrmPersonResultSchema = z.object({
  personId: UuidSchema,
  personCode: z.string(),
});

export const AssignWorkToPersonResultSchema = z.object({
  previousWorkAssignmentId: UuidSchema,
  newWorkAssignmentId: UuidSchema,
});

export const HireEmployeeResultSchema = z.object({
  employeeId: UuidSchema,
  employmentId: UuidSchema,
  workAssignmentId: UuidSchema,
  contractId: UuidSchema.optional(),
  onboardingPlanId: UuidSchema.optional(),
});

export const TransferEmployeeResultSchema = z.object({
  previousWorkAssignmentId: UuidSchema,
  newWorkAssignmentId: UuidSchema,
});

export const PromoteEmployeeResultSchema = z.object({
  employmentId: UuidSchema,
  previousWorkAssignmentId: UuidSchema,
  newWorkAssignmentId: UuidSchema,
});

export const AddEmploymentContractResultSchema = z.object({
  contractId: UuidSchema,
  employmentId: UuidSchema,
});

export const TerminateEmploymentResultSchema = z.object({
  employmentId: UuidSchema,
  terminatedAt: z.string(),
  separationCaseId: UuidSchema.optional(),
});

export const SuspendEmploymentResultSchema = z.object({
  employmentId: UuidSchema,
  suspendedAt: z.string(),
});

export const ResumeEmploymentResultSchema = z.object({
  employmentId: UuidSchema,
  resumedAt: z.string(),
});

export const ChangeEmploymentTermsResultSchema = z.object({
  employmentId: UuidSchema,
  contractId: UuidSchema.optional(),
});

export const RecordPersonIdentityResultSchema = z.object({
  identityId: UuidSchema,
  personId: UuidSchema,
});

export const RehireEmployeeResultSchema = z.object({
  employmentId: UuidSchema,
  employeeId: UuidSchema,
  workAssignmentId: UuidSchema,
  contractId: UuidSchema.optional(),
});

export const CreatePersonCommandSchema = CreateHrmPersonCommandSchema;
export const CreatePersonResultSchema = CreateHrmPersonResultSchema;
export const AssignWorkCommandSchema = AssignWorkToPersonCommandSchema;
export const AssignWorkResultSchema = AssignWorkToPersonResultSchema;

export type CreateHrmPersonCommand = z.infer<typeof CreateHrmPersonCommandSchema>;
export type AssignWorkToPersonCommand = z.infer<typeof AssignWorkToPersonCommandSchema>;
export type HireEmployeeCommand = z.infer<typeof HireEmployeeCommandSchema>;
export type TransferEmployeeCommand = z.infer<typeof TransferEmployeeCommandSchema>;
export type PromoteEmployeeCommand = z.infer<typeof PromoteEmployeeCommandSchema>;
export type AddEmploymentContractCommand = z.infer<typeof AddEmploymentContractCommandSchema>;
export type TerminateEmploymentCommand = z.infer<typeof TerminateEmploymentCommandSchema>;
export type SuspendEmploymentCommand = z.infer<typeof SuspendEmploymentCommandSchema>;
export type ResumeEmploymentCommand = z.infer<typeof ResumeEmploymentCommandSchema>;
export type ChangeEmploymentTermsCommand = z.infer<typeof ChangeEmploymentTermsCommandSchema>;
export type RehireEmployeeCommand = z.infer<typeof RehireEmployeeCommandSchema>;
export type CreateHrmPersonResult = z.infer<typeof CreateHrmPersonResultSchema>;
export type AssignWorkToPersonResult = z.infer<typeof AssignWorkToPersonResultSchema>;
export type HireEmployeeResult = z.infer<typeof HireEmployeeResultSchema>;
export type TransferEmployeeResult = z.infer<typeof TransferEmployeeResultSchema>;
export type PromoteEmployeeResult = z.infer<typeof PromoteEmployeeResultSchema>;
export type AddEmploymentContractResult = z.infer<typeof AddEmploymentContractResultSchema>;
export type TerminateEmploymentResult = z.infer<typeof TerminateEmploymentResultSchema>;
export type SuspendEmploymentResult = z.infer<typeof SuspendEmploymentResultSchema>;
export type ResumeEmploymentResult = z.infer<typeof ResumeEmploymentResultSchema>;
export type ChangeEmploymentTermsResult = z.infer<typeof ChangeEmploymentTermsResultSchema>;
export type RecordPersonIdentityResult = z.infer<typeof RecordPersonIdentityResultSchema>;
export type RehireEmployeeResult = z.infer<typeof RehireEmployeeResultSchema>;
