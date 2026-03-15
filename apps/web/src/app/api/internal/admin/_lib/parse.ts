const BAN_EXPIRES_IN_MIN_SECONDS = 60;
const BAN_EXPIRES_IN_MAX_SECONDS = 31_536_000;

export function parsePositiveInteger(raw: string | null, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export function parseTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

export function normalizeBanExpiresInSeconds(input: number | undefined): number | undefined {
  if (input === undefined) {
    return undefined;
  }

  const rounded = Math.floor(input);
  if (
    !Number.isFinite(rounded) ||
    rounded < BAN_EXPIRES_IN_MIN_SECONDS ||
    rounded > BAN_EXPIRES_IN_MAX_SECONDS
  ) {
    return undefined;
  }

  return rounded;
}
