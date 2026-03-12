export type TreasuryPostingLine = {
  accountCode: string;
  side: "debit" | "credit";
  amountMinor: string;
  currencyCode: string;
};

export function buildBalancedPosting(lines: TreasuryPostingLine[]): TreasuryPostingLine[] {
  const debits = lines
    .filter((l) => l.side === "debit")
    .reduce((acc, l) => acc + BigInt(l.amountMinor), BigInt(0));
  const credits = lines
    .filter((l) => l.side === "credit")
    .reduce((acc, l) => acc + BigInt(l.amountMinor), BigInt(0));

  if (debits !== credits) {
    throw new Error("TREASURY_POSTING_UNBALANCED");
  }

  return lines;
}
