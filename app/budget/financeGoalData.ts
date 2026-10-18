import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/database";

export interface FinanceGoalData {
  id: string;
  accountId: string;
  name: string;
  kind: "EMERGENCY" | "PURCHASE" | "GENERAL";
  targetCents: string;
  allocatedCents: string;
  monthlyContributionCents: string;
}

export async function getFinanceGoals(): Promise<FinanceGoalData[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to view Finance");
  const goals = await prisma.financeGoal.findMany({ where: { userId, archivedAt: null }, orderBy: [{ kind: "asc" }, { createdAt: "asc" }] });
  return goals.map((goal) => ({
    id: goal.id,
    accountId: goal.accountId,
    name: goal.name,
    kind: goal.kind,
    targetCents: goal.targetCents.toString(),
    allocatedCents: goal.allocatedCents.toString(),
    monthlyContributionCents: goal.monthlyContributionCents.toString(),
  }));
}
