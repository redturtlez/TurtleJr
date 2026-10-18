export interface RecordedTransaction {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amountCents: string;
  voidedAt?: string | null;
}

export function summarizeRecorded(transactions: readonly RecordedTransaction[]) {
  let incomeCents = BigInt(0);
  let expenseCents = BigInt(0);
  let transferCents = BigInt(0);
  for (const transaction of transactions) {
    if (transaction.voidedAt) continue;
    const amount = BigInt(transaction.amountCents);
    if (transaction.type === "INCOME") incomeCents += amount;
    else if (transaction.type === "EXPENSE") expenseCents += amount;
    else transferCents += amount;
  }
  return { incomeCents, expenseCents, transferCents, netCashFlowCents: incomeCents - expenseCents };
}
