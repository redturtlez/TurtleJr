"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { parseUsdToCents } from "@/lib/finance/money";
import { activeOwnedAccountWhere, ownedSnapshotWhere } from "./financeOwnership";
import { balanceCorrectionSchema, balanceSnapshotSchema, financeAccountSchema, financeAccountUpdateSchema, financeIdSchema } from "./financeValidation";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to update Finance");
  return userId;
}

function refreshFinance(): void {
  revalidatePath("/budget");
}

export async function createFinanceAccount(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeAccountSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid account");
  await prisma.financeAccount.create({ data: { ...parsed.data, userId } });
  refreshFinance();
}

export async function updateFinanceAccount(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeAccountUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid account");
  const { id, ...data } = parsed.data;
  const result = await prisma.financeAccount.updateMany({ where: activeOwnedAccountWhere(userId, id), data });
  if (result.count !== 1) throw new Error("Account not found");
  refreshFinance();
}

export async function archiveFinanceAccount(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeIdSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid account");
  const activePlanItems = await prisma.financePlanItem.count({ where: { accountId: parsed.data, userId, archivedAt: null } });
  if (activePlanItems > 0) throw new Error("Archive this account's planned cash-flow items first");
  const activeGoals = await prisma.financeGoal.count({ where: { accountId: parsed.data, userId, archivedAt: null } });
  if (activeGoals > 0) throw new Error("Archive this account's savings goals first");
  const result = await prisma.financeAccount.updateMany({
    where: activeOwnedAccountWhere(userId, parsed.data),
    data: { archivedAt: new Date() },
  });
  if (result.count !== 1) throw new Error("Account not found");
  refreshFinance();
}

export async function recordBalanceSnapshot(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = balanceSnapshotSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid balance update");
  const account = await prisma.financeAccount.findFirst({
    where: activeOwnedAccountWhere(userId, parsed.data.accountId),
    select: { id: true },
  });
  if (!account) throw new Error("Account not found");
  await prisma.financeBalanceSnapshot.create({
    data: {
      userId,
      accountId: account.id,
      balanceCents: parseUsdToCents(parsed.data.balance),
      asOfDate: parsed.data.asOfDate,
      note: parsed.data.note || null,
    },
  });
  refreshFinance();
}

export async function correctBalanceSnapshot(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = balanceCorrectionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid correction");

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.financeBalanceSnapshot.findFirst({
      where: { ...ownedSnapshotWhere(userId, parsed.data.snapshotId), correctedAt: null },
      select: { id: true, accountId: true },
    });
    if (!existing) throw new Error("Balance record not found or already corrected");

    const account = await transaction.financeAccount.findFirst({
      where: activeOwnedAccountWhere(userId, existing.accountId),
      select: { id: true },
    });
    if (!account) throw new Error("Account not found");

    const correctedAt = new Date();
    const result = await transaction.financeBalanceSnapshot.updateMany({
      where: { ...ownedSnapshotWhere(userId, existing.id), correctedAt: null },
      data: { correctedAt },
    });
    if (result.count !== 1) throw new Error("Balance record changed; refresh and try again");

    await transaction.financeBalanceSnapshot.create({
      data: {
        userId,
        accountId: account.id,
        balanceCents: parseUsdToCents(parsed.data.balance),
        asOfDate: parsed.data.asOfDate,
        note: parsed.data.note || null,
        replacesSnapshotId: existing.id,
      },
    });
  });
  refreshFinance();
}
