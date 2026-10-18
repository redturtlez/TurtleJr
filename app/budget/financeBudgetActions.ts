"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { parseUsdToCents } from "@/lib/finance/money";
import { activeOwnedAccountWhere } from "./financeOwnership";
import { financeIdSchema } from "./financeValidation";
import { planItemSchema, planItemUpdateSchema, transactionSchema, transactionUpdateSchema } from "./financeBudgetValidation";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to update Finance");
  return userId;
}

function refresh(): void { revalidatePath("/budget"); }

async function requireAccount(userId: string, accountId: string): Promise<void> {
  const account = await prisma.financeAccount.findFirst({ where: activeOwnedAccountWhere(userId, accountId), select: { id: true } });
  if (!account) throw new Error("Account not found");
}

function planData(data: typeof planItemSchema._output) {
  const days = data.recurrence === "SEMIMONTHLY"
    ? [data.semimonthlyFirstDay!, data.semimonthlySecondDay!].toSorted((left, right) => left - right)
    : [null, null];
  return {
    accountId: data.accountId,
    name: data.name,
    kind: data.kind,
    amountCents: parseUsdToCents(data.amount),
    category: data.category || null,
    recurrence: data.recurrence,
    startDate: data.startDate,
    semimonthlyFirstDay: days[0],
    semimonthlySecondDay: days[1],
  };
}

export async function createPlanItem(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = planItemSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid planned item");
  await requireAccount(userId, parsed.data.accountId);
  await prisma.financePlanItem.create({ data: { ...planData(parsed.data), userId } });
  refresh();
}

export async function updatePlanItem(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = planItemUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid planned item");
  await requireAccount(userId, parsed.data.accountId);
  const existing = await prisma.financePlanItem.findFirst({ where: { id: parsed.data.id, userId, archivedAt: null }, select: { id: true } });
  if (!existing) throw new Error("Planned item not found");
  const result = await prisma.financePlanItem.updateMany({ where: { id: existing.id, userId, archivedAt: null }, data: planData(parsed.data) });
  if (result.count !== 1) throw new Error("Planned item changed; refresh and try again");
  refresh();
}

export async function archivePlanItem(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeIdSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid planned item");
  const result = await prisma.financePlanItem.updateMany({ where: { id: parsed.data, userId, archivedAt: null }, data: { archivedAt: new Date() } });
  if (result.count !== 1) throw new Error("Planned item not found");
  refresh();
}

async function validateTransactionAccounts(userId: string, accountId: string, transferAccountId: string | null): Promise<void> {
  await requireAccount(userId, accountId);
  if (transferAccountId) await requireAccount(userId, transferAccountId);
}

function transactionData(data: typeof transactionSchema._output) {
  return {
    accountId: data.accountId,
    transferAccountId: data.type === "TRANSFER" ? data.transferAccountId : null,
    name: data.name,
    type: data.type,
    amountCents: parseUsdToCents(data.amount),
    occurredOn: data.occurredOn,
    category: data.category || null,
    note: data.note || null,
  };
}

export async function createRecordedTransaction(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid transaction");
  await validateTransactionAccounts(userId, parsed.data.accountId, parsed.data.transferAccountId);
  await prisma.financeTransaction.create({ data: { ...transactionData(parsed.data), userId } });
  refresh();
}

export async function updateRecordedTransaction(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = transactionUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid transaction");
  await validateTransactionAccounts(userId, parsed.data.accountId, parsed.data.transferAccountId);
  const result = await prisma.financeTransaction.updateMany({ where: { id: parsed.data.id, userId, voidedAt: null }, data: transactionData(parsed.data) });
  if (result.count !== 1) throw new Error("Transaction not found");
  refresh();
}

export async function voidRecordedTransaction(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeIdSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid transaction");
  const result = await prisma.financeTransaction.updateMany({ where: { id: parsed.data, userId, voidedAt: null }, data: { voidedAt: new Date() } });
  if (result.count !== 1) throw new Error("Transaction not found");
  refresh();
}
