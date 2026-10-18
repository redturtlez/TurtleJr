-- CreateEnum
CREATE TYPE "FinanceAccountType" AS ENUM ('CHECKING', 'SAVINGS');

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceAccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "balanceCents" BIGINT NOT NULL,
    "asOfDate" TEXT NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctedAt" TIMESTAMP(3),
    "replacesSnapshotId" TEXT,

    CONSTRAINT "FinanceBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAccount_id_userId_key" ON "FinanceAccount"("id", "userId");

-- CreateIndex
CREATE INDEX "FinanceAccount_userId_archivedAt_idx" ON "FinanceAccount"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceBalanceSnapshot_replacesSnapshotId_key" ON "FinanceBalanceSnapshot"("replacesSnapshotId");

-- CreateIndex
CREATE INDEX "FinanceBalanceSnapshot_accountId_userId_idx" ON "FinanceBalanceSnapshot"("accountId", "userId");

-- CreateIndex
CREATE INDEX "FinanceBalanceSnapshot_userId_accountId_asOfDate_recordedAt_idx" ON "FinanceBalanceSnapshot"("userId", "accountId", "asOfDate", "recordedAt");

-- CreateIndex
CREATE INDEX "FinanceBalanceSnapshot_userId_correctedAt_idx" ON "FinanceBalanceSnapshot"("userId", "correctedAt");
