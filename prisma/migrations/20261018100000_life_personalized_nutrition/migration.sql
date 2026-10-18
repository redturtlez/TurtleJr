-- CreateEnum
CREATE TYPE "LifeEnergyEquationSex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "LifeActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "LifeNutritionFeedbackTarget" AS ENUM ('FOOD', 'MEAL', 'RECIPE');

-- AlterTable
ALTER TABLE "LifeNutritionSettings"
ADD COLUMN "ageYears" INTEGER,
ADD COLUMN "heightMillimeters" INTEGER,
ADD COLUMN "energyEquationSex" "LifeEnergyEquationSex",
ADD COLUMN "activityLevel" "LifeActivityLevel",
ADD COLUMN "resistanceTraining" BOOLEAN,
ADD COLUMN "targetWeeklyLossGrams" INTEGER,
ADD COLUMN "preferredFoods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "acceptableFoods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "avoidedFoods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "preferenceProfileSet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LifeFood" ADD COLUMN "waterMg" INTEGER;

-- AlterTable
ALTER TABLE "LifeFoodLog" ADD COLUMN "waterMgSnapshot" INTEGER;

-- AlterTable
ALTER TABLE "LifeMeal"
ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "defaultMealSlot" "LifeMealSlot";

-- CreateTable
CREATE TABLE "LifeNutritionFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "LifeNutritionFeedbackTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetNameSnapshot" TEXT NOT NULL,
    "fullness" INTEGER,
    "enjoyment" INTEGER,
    "convenience" INTEGER,
    "eatAgain" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeNutritionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LifeNutritionFeedback_userId_targetType_targetId_key" ON "LifeNutritionFeedback"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "LifeNutritionFeedback_userId_targetType_idx" ON "LifeNutritionFeedback"("userId", "targetType");

-- AddForeignKey
ALTER TABLE "LifeNutritionFeedback" ADD CONSTRAINT "LifeNutritionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LifeProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
