import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const LiquiditySourceFeedTypeValues = [
  "ap_due_payment",
  "ar_expected_receipt",
  "manual_adjustment",
] as const;
export const LiquiditySourceFeedTypeSchema = z.enum(LiquiditySourceFeedTypeValues);

export const LiquiditySourceFeedStatusValues = ["open", "consumed", "cancelled"] as const;
export const LiquiditySourceFeedStatusSchema = z.enum(LiquiditySourceFeedStatusValues);

export const LiquiditySourceDirectionValues = ["inflow", "outflow"] as const;
export const LiquiditySourceDirectionSchema = z.enum(LiquiditySourceDirectionValues);

export const LiquiditySourceFeedIdSchema = brandedUuid("LiquiditySourceFeedId");
export type LiquiditySourceFeedId = z.infer<typeof LiquiditySourceFeedIdSchema>;

export const LiquiditySourceFeedSchema = z.object({
  id: LiquiditySourceFeedIdSchema,
  orgId: OrgIdSchema,
  sourceType: LiquiditySourceFeedTypeSchema,
  sourceId: z.string().uuid(),
  sourceDocumentNumber: z.string().trim().max(128).nullable(),
  bankAccountId: z.string().uuid().nullable(),
  currencyCode: CurrencyCodeSchema,
  amountMinor: z.string(),
  dueDate: z.string().date(),
  direction: LiquiditySourceDirectionSchema,
  confidenceScore: z.number().min(0).max(1).nullable(),
  status: LiquiditySourceFeedStatusSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type LiquiditySourceFeed = z.infer<typeof LiquiditySourceFeedSchema>;
