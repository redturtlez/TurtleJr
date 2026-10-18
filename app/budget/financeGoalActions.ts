"use server";

import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { parseUsdToCents } from "@/lib/finance/money";
import { financeGoalSchema, financeGoalUpdateSchema } from "./financeGoalValidation";
import { financeIdSchema } from "./financeValidation";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to update Finance");
  return userId;
}

function goalData(data: typeof financeGoalSchema._output) {
  return {
    accountId: data.accountId,
    name: data.name,
    kind: data.kind,
    targetCents: parseUsdToCents(data.target),
    allocatedCents: parseUsdToCents(data.allocation),
    monthlyContributionCents: parseUsdToCents(data.monthlyContribution),
  };
}

async function requireAllocationCapacity(transaction: Prisma.TransactionClient, userId: string, accountId: string, allocationCents: bigint, excludedGoalId?: string): Promise<void> {
  const account = await transaction.financeAccount.findFirst({
    where: { id: accountId, userId, archivedAt: null, type: "SAVINGS" },
    select: { snapshots: { where: { correctedAt: null }, orderBy: [{ asOfDate: "desc" }, { recordedAt: "desc" }], take: 1, select: { balanceCents: true } } },
  });
  if (!account) throw new Error("Active savings account not found");
  const balance = account.snapshots[0]?.balanceCents ?? BigInt(0);
  const otherGoals = await transaction.financeGoal.aggregate({
    where: { userId, accountId, archivedAt: null, ...(excludedGoalId ? { id: { not: excludedGoalId } } : {}) },
    _sum: { allocatedCents: true },
  });
  const available = balance > BigInt(0) ? balance : BigInt(0);
  if ((otherGoals._sum.allocatedCents ?? BigInt(0)) + allocationCents > available) throw new Error("Goal allocations cannot exceed this account's latest balance");
}

export async function createFinanceGoal(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeGoalSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid goal");
  const data = goalData(parsed.data);
  await prisma.$transaction(async (transaction) => {
    await requireAllocationCapacity(transaction, userId, data.accountId, data.allocatedCents);
    await transaction.financeGoal.create({ data: { ...data, userId } });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/budget");
}

export async function updateFinanceGoal(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeGoalUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid goal");
  const data = goalData(parsed.data);
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.financeGoal.findFirst({ where: { id: parsed.data.id, userId, archivedAt: null }, select: { id: true } });
    if (!existing) throw new Error("Goal not found");
    await requireAllocationCapacity(transaction, userId, data.accountId, data.allocatedCents, existing.id);
    const result = await transaction.financeGoal.updateMany({ where: { id: existing.id, userId, archivedAt: null }, data });
    if (result.count !== 1) throw new Error("Goal changed; refresh and try again");
  }, { isolationLevel: "Serializable" });
  revalidatePath("/budget");
}

export async function archiveFinanceGoal(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = financeIdSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid goal");
  const result = await prisma.financeGoal.updateMany({ where: { id: parsed.data, userId, archivedAt: null }, data: { archivedAt: new Date() } });
  if (result.count !== 1) throw new Error("Goal not found");
  revalidatePath("/budget");
}
