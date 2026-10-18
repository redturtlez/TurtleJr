import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/database";
import type { FinancePlanKindValue, FinanceRecurrenceValue } from "@/lib/finance/recurrence";

export interface FinancePlanItemData {
  id: string;
  accountId: string;
  name: string;
  kind: FinancePlanKindValue;
  amountCents: string;
  category: string | null;
  recurrence: FinanceRecurrenceValue;
  startDate: string;
  semimonthlyFirstDay: number | null;
  semimonthlySecondDay: number | null;
}

export interface FinanceTransactionData {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amountCents: string;
  occurredOn: string;
  category: string | null;
  note: string | null;
}

export interface FinanceBudgetData {
  planItems: FinancePlanItemData[];
  transactions: FinanceTransactionData[];
}

export async function getFinanceBudgetData(): Promise<FinanceBudgetData> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to view Finance");
  const [planItems, transactions] = await Promise.all([
    prisma.financePlanItem.findMany({ where: { userId, archivedAt: null }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.financeTransaction.findMany({ where: { userId, voidedAt: null }, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }] }),
  ]);
  return {
    planItems: planItems.map((item) => ({
      id: item.id, accountId: item.accountId, name: item.name, kind: item.kind, amountCents: item.amountCents.toString(), category: item.category,
      recurrence: item.recurrence, startDate: item.startDate, semimonthlyFirstDay: item.semimonthlyFirstDay, semimonthlySecondDay: item.semimonthlySecondDay,
    })),
    transactions: transactions.map((item) => ({ id: item.id, accountId: item.accountId, transferAccountId: item.transferAccountId, name: item.name, type: item.type, amountCents: item.amountCents.toString(), occurredOn: item.occurredOn, category: item.category, note: item.note })),
  };
}
