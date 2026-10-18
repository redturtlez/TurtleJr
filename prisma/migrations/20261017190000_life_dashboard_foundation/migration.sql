-- CreateEnum
CREATE TYPE "LifeActivityKind" AS ENUM ('ROUTINE', 'HABIT');

-- CreateEnum
CREATE TYPE "LifeScheduleType" AS ENUM ('SEQUENTIAL', 'FIXED_TIME', 'FLEXIBLE_WINDOW');

-- CreateEnum
CREATE TYPE "LifeActivityImportance" AS ENUM ('ESSENTIAL', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "LifeCompletionStatus" AS ENUM ('COMPLETED', 'SNOOZED', 'SKIPPED');

-- CreateTable
CREATE TABLE "LifeProfile" (
    "userId" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LifeRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" TEXT,
    "kind" "LifeActivityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "estimatedDurationMinutes" INTEGER,
    "minimumDurationMinutes" INTEGER,
    "preferredDurationMinutes" INTEGER,
    "scheduleType" "LifeScheduleType" NOT NULL,
    "fixedTimeMinutes" INTEGER,
    "windowStartMinutes" INTEGER,
    "windowEndMinutes" INTEGER,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
    "importance" "LifeActivityImportance" NOT NULL DEFAULT 'OPTIONAL',
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "status" "LifeCompletionStatus" NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LifeRoutine_userId_active_idx" ON "LifeRoutine"("userId", "active");

-- CreateIndex
CREATE INDEX "LifeActivity_userId_active_idx" ON "LifeActivity"("userId", "active");

-- CreateIndex
CREATE INDEX "LifeActivity_routineId_position_idx" ON "LifeActivity"("routineId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LifeCompletion_activityId_localDate_key" ON "LifeCompletion"("activityId", "localDate");

-- CreateIndex
CREATE INDEX "LifeCompletion_userId_localDate_idx" ON "LifeCompletion"("userId", "localDate");
