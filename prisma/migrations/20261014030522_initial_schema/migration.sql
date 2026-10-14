-- CreateTable
CREATE TABLE "Todo" (
    "userid" TEXT NOT NULL DEFAULT 'turtle',
    "todos" JSONB
);

-- CreateTable
CREATE TABLE "Budget" (
    "userid" TEXT NOT NULL DEFAULT 'turtle',
    "budgetItems" JSONB
);

-- CreateIndex
CREATE UNIQUE INDEX "Todo_userid_key" ON "Todo"("userid");

-- CreateIndex
CREATE INDEX "Todo_userid_idx" ON "Todo"("userid");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userid_key" ON "Budget"("userid");

-- CreateIndex
CREATE INDEX "Budget_userid_idx" ON "Budget"("userid");
