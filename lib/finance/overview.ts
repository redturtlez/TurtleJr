export interface OverviewSnapshot {
  balanceCents: string;
  asOfDate: string;
  recordedAt: string;
  correctedAt: string | null;
}

export interface OverviewAccount {
  id: string;
  snapshots: readonly OverviewSnapshot[];
}

export interface CashHistoryPoint {
  date: string;
  totalCents: bigint;
  accountIds: string[];
}

export interface ComparableBalanceChange {
  fromDate: string;
  toDate: string;
  changeCents: bigint;
}

export function buildCashHistory(accounts: readonly OverviewAccount[]): CashHistoryPoint[] {
  const activeByAccount = accounts.map((account) => ({
    id: account.id,
    snapshots: account.snapshots
      .filter((snapshot) => snapshot.correctedAt === null)
      .toSorted((left, right) => left.asOfDate.localeCompare(right.asOfDate) || new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime()),
  }));
  const dates = [...new Set(activeByAccount.flatMap((account) => account.snapshots.map((snapshot) => snapshot.asOfDate)))].toSorted();
  return dates.map((date) => {
    let total = BigInt(0);
    const accountIds: string[] = [];
    for (const account of activeByAccount) {
      const latest = account.snapshots.filter((snapshot) => snapshot.asOfDate <= date).at(-1);
      if (!latest) continue;
      total += BigInt(latest.balanceCents);
      accountIds.push(account.id);
    }
    return { date, totalCents: total, accountIds: accountIds.toSorted() };
  });
}

export function latestComparableBalanceChange(history: readonly CashHistoryPoint[]): ComparableBalanceChange | null {
  const latest = history.at(-1);
  if (!latest) return null;
  const signature = latest.accountIds.join("|");
  for (let index = history.length - 2; index >= 0; index -= 1) {
    const previous = history[index];
    if (previous && previous.accountIds.join("|") === signature) return { fromDate: previous.date, toDate: latest.date, changeCents: latest.totalCents - previous.totalCents };
  }
  return null;
}

export function savingsRateBasisPoints(incomeCents: string | bigint, surplusCents: string | bigint): number | null {
  const income = typeof incomeCents === "bigint" ? incomeCents : BigInt(incomeCents);
  const surplus = typeof surplusCents === "bigint" ? surplusCents : BigInt(surplusCents);
  if (income <= BigInt(0)) return null;
  return Number((surplus * BigInt(10_000)) / income);
}

export function fundingCoverageBasisPoints(items: readonly { targetCents: string; allocatedCents: string }[]): number | null {
  let target = BigInt(0);
  let allocated = BigInt(0);
  for (const item of items) {
    target += BigInt(item.targetCents);
    allocated += BigInt(item.allocatedCents);
  }
  if (target <= BigInt(0)) return null;
  return Number((allocated * BigInt(10_000)) / target);
}
