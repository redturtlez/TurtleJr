-- CreateEnum
CREATE TYPE "FinanceGoalKind" AS ENUM ('EMERGENCY', 'PURCHASE', 'GENERAL');

-- CreateTable
CREATE TABLE "FinanceGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FinanceGoalKind" NOT NULL,
    "targetCents" BIGINT NOT NULL,
    "allocatedCents" BIGINT NOT NULL,
    "monthlyContributionCents" BIGINT NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceGoal_accountId_userId_idx" ON "FinanceGoal"("accountId", "userId");

-- CreateIndex
CREATE INDEX "FinanceGoal_userId_archivedAt_idx" ON "FinanceGoal"("userId", "archivedAt");
