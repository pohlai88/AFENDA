export type PaymentRoutingInput = {
  amountMinor: string;
  currencyCode: string;
  preferredMethod?: string | null;
};

export type PaymentRoutingDecision = {
  channel: string;
  reason: string;
};

export function evaluatePaymentRouting(input: PaymentRoutingInput): PaymentRoutingDecision {
  if (input.preferredMethod && input.preferredMethod.trim().length > 0) {
    return { channel: input.preferredMethod, reason: "preferred_method" };
  }

  const amount = BigInt(input.amountMinor);
  if (amount >= BigInt("100000000")) {
    return { channel: "wire", reason: "high_value" };
  }

  return { channel: "ach", reason: "default" };
}
