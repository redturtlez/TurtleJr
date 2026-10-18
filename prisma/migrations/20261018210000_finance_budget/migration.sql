-- CreateEnum
CREATE TYPE "FinancePlanKind" AS ENUM ('INCOME', 'BILL', 'ALLOWANCE');

-- CreateEnum
CREATE TYPE "FinanceRecurrence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateTable
CREATE TABLE "FinancePlanItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FinancePlanKind" NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "category" TEXT,
    "recurrence" "FinanceRecurrence" NOT NULL,
    "startDate" TEXT NOT NULL,
    "semimonthlyFirstDay" INTEGER,
    "semimonthlySecondDay" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancePlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "transferAccountId" TEXT,
    "name" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "occurredOn" TEXT NOT NULL,
    "category" TEXT,
    "note" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancePlanItem_accountId_userId_idx" ON "FinancePlanItem"("accountId", "userId");

-- CreateIndex
CREATE INDEX "FinancePlanItem_userId_archivedAt_idx" ON "FinancePlanItem"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "FinanceTransaction_accountId_userId_idx" ON "FinanceTransaction"("accountId", "userId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_transferAccountId_userId_idx" ON "FinanceTransaction"("transferAccountId", "userId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_userId_occurredOn_voidedAt_idx" ON "FinanceTransaction"("userId", "occurredOn", "voidedAt");
