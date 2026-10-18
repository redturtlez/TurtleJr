CREATE TYPE "LifeWorkoutSessionStatus" AS ENUM ('COMPLETED', 'SKIPPED');
CREATE TYPE "LifeCreativeProjectStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');

CREATE TABLE "LifeWorkoutPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "activityId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeWorkoutPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeWorkoutExercise" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetSets" INTEGER,
    "targetReps" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LifeWorkoutExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeWorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "status" "LifeWorkoutSessionStatus" NOT NULL DEFAULT 'COMPLETED',
    "durationMinutes" INTEGER,
    "note" TEXT,
    "planNameSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifeWorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeWorkoutExerciseResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "exerciseNameSnapshot" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LifeWorkoutExerciseResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeCreativeProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "LifeCreativeProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "activityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeCreativeProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeCreativeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "localDate" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "note" TEXT,
    "projectNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifeCreativeSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeWorkoutPlan_userId_active_idx" ON "LifeWorkoutPlan"("userId", "active");
CREATE INDEX "LifeWorkoutPlan_activityId_idx" ON "LifeWorkoutPlan"("activityId");
CREATE INDEX "LifeWorkoutExercise_planId_position_idx" ON "LifeWorkoutExercise"("planId", "position");
CREATE INDEX "LifeWorkoutSession_userId_localDate_idx" ON "LifeWorkoutSession"("userId", "localDate");
CREATE INDEX "LifeWorkoutSession_planId_localDate_idx" ON "LifeWorkoutSession"("planId", "localDate");
CREATE INDEX "LifeWorkoutExerciseResult_sessionId_position_idx" ON "LifeWorkoutExerciseResult"("sessionId", "position");
CREATE INDEX "LifeWorkoutExerciseResult_exerciseId_idx" ON "LifeWorkoutExerciseResult"("exerciseId");
CREATE INDEX "LifeCreativeProject_userId_status_idx" ON "LifeCreativeProject"("userId", "status");
CREATE INDEX "LifeCreativeProject_activityId_idx" ON "LifeCreativeProject"("activityId");
CREATE INDEX "LifeCreativeSession_userId_localDate_idx" ON "LifeCreativeSession"("userId", "localDate");
CREATE INDEX "LifeCreativeSession_projectId_localDate_idx" ON "LifeCreativeSession"("projectId", "localDate");
