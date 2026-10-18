export type FinancePlanKindValue = "INCOME" | "BILL" | "ALLOWANCE";
export type FinanceRecurrenceValue = "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface RecurringPlan {
  id: string;
  name: string;
  accountId: string;
  kind: FinancePlanKindValue;
  amountCents: string;
  recurrence: FinanceRecurrenceValue;
  startDate: string;
  semimonthlyFirstDay: number | null;
  semimonthlySecondDay: number | null;
}

export interface PlannedOccurrence {
  planId: string;
  name: string;
  accountId: string;
  kind: FinancePlanKindValue;
  amountCents: string;
  date: string;
}

const DAY_MS = 86_400_000;

function parseKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function key(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function monthDifference(start: Date, candidate: Date): number {
  return (candidate.getUTCFullYear() - start.getUTCFullYear()) * 12 + candidate.getUTCMonth() - start.getUTCMonth();
}

function occursOn(plan: RecurringPlan, candidate: Date): boolean {
  const anchor = parseKey(plan.startDate);
  if (candidate < anchor) return false;
  const elapsedDays = Math.round((candidate.getTime() - anchor.getTime()) / DAY_MS);
  if (plan.recurrence === "WEEKLY") return elapsedDays % 7 === 0;
  if (plan.recurrence === "BIWEEKLY") return elapsedDays % 14 === 0;

  const year = candidate.getUTCFullYear();
  const month = candidate.getUTCMonth();
  const day = candidate.getUTCDate();
  const monthDelta = monthDifference(anchor, candidate);
  if (plan.recurrence === "SEMIMONTHLY") {
    const lastDay = daysInMonth(year, month);
    const first = Math.min(plan.semimonthlyFirstDay ?? 1, lastDay);
    const second = Math.min(plan.semimonthlySecondDay ?? 15, lastDay);
    return day === first || day === second;
  }
  if (plan.recurrence === "MONTHLY" || plan.recurrence === "QUARTERLY") {
    const interval = plan.recurrence === "MONTHLY" ? 1 : 3;
    return monthDelta % interval === 0 && day === Math.min(anchor.getUTCDate(), daysInMonth(year, month));
  }
  return month === anchor.getUTCMonth() && day === Math.min(anchor.getUTCDate(), daysInMonth(year, month));
}

export function generateOccurrences(plans: readonly RecurringPlan[], startDate: string, endDate: string): PlannedOccurrence[] {
  const start = parseKey(startDate);
  const end = parseKey(endDate);
  if (end < start) throw new Error("Forecast end date must not precede its start date");
  if ((end.getTime() - start.getTime()) / DAY_MS > 1096) throw new Error("Forecast window is too large");

  const output: PlannedOccurrence[] = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    for (const plan of plans) {
      if (!occursOn(plan, cursor)) continue;
      output.push({ planId: plan.id, name: plan.name, accountId: plan.accountId, kind: plan.kind, amountCents: plan.amountCents, date: key(cursor) });
    }
  }
  return output.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name));
}

export function summarizePlanned(occurrences: readonly PlannedOccurrence[]) {
  let incomeCents = BigInt(0);
  let billCents = BigInt(0);
  let allowanceCents = BigInt(0);
  for (const occurrence of occurrences) {
    const amount = BigInt(occurrence.amountCents);
    if (occurrence.kind === "INCOME") incomeCents += amount;
    else if (occurrence.kind === "BILL") billCents += amount;
    else allowanceCents += amount;
  }
  return { incomeCents, billCents, allowanceCents, surplusCents: incomeCents - billCents - allowanceCents };
}

export function addDaysToKey(value: string, days: number): string {
  return key(new Date(parseKey(value).getTime() + days * DAY_MS));
}
