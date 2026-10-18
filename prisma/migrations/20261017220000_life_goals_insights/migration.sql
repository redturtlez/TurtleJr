-- CreateEnum
CREATE TYPE "LifeGoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LifeRecommendationFeedbackStatus" AS ENUM ('ACCEPTED', 'DISMISSED', 'SNOOZED');

-- CreateTable
CREATE TABLE "LifeGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION,
    "targetUnit" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "LifeGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeGoalProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifeGoalProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeActivityGoal" (
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifeActivityGoal_pkey" PRIMARY KEY ("activityId","goalId")
);

CREATE TABLE "LifeRecommendationFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" "LifeRecommendationFeedbackStatus" NOT NULL,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeRecommendationFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeGoal_userId_status_idx" ON "LifeGoal"("userId", "status");
CREATE INDEX "LifeGoalProgress_goalId_localDate_idx" ON "LifeGoalProgress"("goalId", "localDate");
CREATE INDEX "LifeGoalProgress_userId_localDate_idx" ON "LifeGoalProgress"("userId", "localDate");
CREATE INDEX "LifeActivityGoal_userId_idx" ON "LifeActivityGoal"("userId");
CREATE INDEX "LifeActivityGoal_goalId_idx" ON "LifeActivityGoal"("goalId");
CREATE UNIQUE INDEX "LifeRecommendationFeedback_userId_fingerprint_key" ON "LifeRecommendationFeedback"("userId", "fingerprint");
CREATE INDEX "LifeRecommendationFeedback_userId_status_idx" ON "LifeRecommendationFeedback"("userId", "status");
