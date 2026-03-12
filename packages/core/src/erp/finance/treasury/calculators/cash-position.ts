export interface CashPositionTotals {
  totalBookBalanceMinor: string;
  totalAvailableBalanceMinor: string;
  totalPendingInflowMinor: string;
  totalPendingOutflowMinor: string;
  totalProjectedAvailableMinor: string;
}

export function addCashMinor(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

export function subCashMinor(a: string, b: string): string {
  return (BigInt(a) - BigInt(b)).toString();
}

export function computeProjectedAvailable(params: {
  availableBalanceMinor: string;
  pendingInflowMinor: string;
  pendingOutflowMinor: string;
}): string {
  return subCashMinor(
    addCashMinor(params.availableBalanceMinor, params.pendingInflowMinor),
    params.pendingOutflowMinor,
  );
}
