import type { DbClient } from "@afenda/db";
import { fxRateSnapshot } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import type { FxRateSnapshotId, OrgId } from "@afenda/contracts";
import { normalizeMinorByScaledRate } from "./calculators/fx-normalization";

export type FxNormalizationServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type FxNormalizationServiceResult =
  | {
      ok: true;
      data: {
        normalizedMinor: string;
        fxRateSnapshotId: FxRateSnapshotId | null;
      };
    }
  | { ok: false; error: FxNormalizationServiceError };

export interface NormalizeToBaseParams {
  orgId: OrgId;
  rateDate: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  amountMinor: string;
  sourceVersion: string;
}

export async function normalizeToBase(
  db: DbClient,
  params: NormalizeToBaseParams,
): Promise<FxNormalizationServiceResult> {
  if (params.fromCurrencyCode === params.toCurrencyCode) {
    return {
      ok: true,
      data: {
        normalizedMinor: params.amountMinor,
        fxRateSnapshotId: null,
      },
    };
  }

  const [rate] = await db
    .select({
      id: fxRateSnapshot.id,
      rateScaled: fxRateSnapshot.rateScaled,
      scale: fxRateSnapshot.scale,
    })
    .from(fxRateSnapshot)
    .where(
      and(
        eq(fxRateSnapshot.orgId, params.orgId),
        eq(fxRateSnapshot.rateDate, params.rateDate),
        eq(fxRateSnapshot.fromCurrencyCode, params.fromCurrencyCode),
        eq(fxRateSnapshot.toCurrencyCode, params.toCurrencyCode),
        eq(fxRateSnapshot.sourceVersion, params.sourceVersion),
      ),
    );

  if (!rate) {
    return {
      ok: false,
      error: {
        code: "TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND",
        message: "FX rate snapshot not found",
        meta: {
          rateDate: params.rateDate,
          fromCurrencyCode: params.fromCurrencyCode,
          toCurrencyCode: params.toCurrencyCode,
          sourceVersion: params.sourceVersion,
        },
      },
    };
  }

  return {
    ok: true,
    data: {
      normalizedMinor: normalizeMinorByScaledRate({
        amountMinor: params.amountMinor,
        rateScaled: rate.rateScaled,
        scale: rate.scale,
      }),
      fxRateSnapshotId: rate.id as FxRateSnapshotId,
    },
  };
}
