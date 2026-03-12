/**
 * Reconciliation calculators — pure math, no DB, no side effects.
 * All amounts are in minor units (cents), represented as decimal strings
 * to avoid BigInt JSON-serialisation issues.
 */

export function addMinor(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

export function subMinor(a: string, b: string): string {
  return (BigInt(a) - BigInt(b)).toString();
}

export function lteMinor(a: string, b: string): boolean {
  return BigInt(a) <= BigInt(b);
}

export function absDiffMinor(a: string, b: string): string {
  const x = BigInt(a);
  const y = BigInt(b);
  return (x >= y ? x - y : y - x).toString();
}

export function isWithinTolerance(params: {
  targetMinor: string;
  matchedMinor: string;
  toleranceMinor: string;
}): boolean {
  const diff = absDiffMinor(params.targetMinor, params.matchedMinor);
  return BigInt(diff) <= BigInt(params.toleranceMinor);
}
