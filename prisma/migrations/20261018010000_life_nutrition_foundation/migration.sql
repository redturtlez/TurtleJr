CREATE TYPE "LifeFoodSource" AS ENUM ('MANUAL', 'USDA');
CREATE TYPE "LifeMealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
CREATE TYPE "LifeNutritionDataQuality" AS ENUM ('KNOWN', 'ESTIMATED');

CREATE TABLE "LifeNutritionSettings" ("userId" TEXT NOT NULL, "weightUnit" TEXT NOT NULL DEFAULT 'LB', "targetWeightGrams" INTEGER, "calorieTargetMilli" INTEGER, "proteinTargetMg" INTEGER, "carbsTargetMg" INTEGER, "fatTargetMg" INTEGER, "fiberTargetMg" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeNutritionSettings_pkey" PRIMARY KEY ("userId"));
CREATE TABLE "LifeWeightEntry" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "localDate" TEXT NOT NULL, "weightGrams" INTEGER NOT NULL, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeWeightEntry_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LifeFood" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "source" "LifeFoodSource" NOT NULL DEFAULT 'MANUAL', "externalId" TEXT, "name" TEXT NOT NULL, "brand" TEXT, "servingLabel" TEXT NOT NULL, "servingGramsMilli" INTEGER, "caloriesMilli" INTEGER, "proteinMg" INTEGER, "carbsMg" INTEGER, "fatMg" INTEGER, "fiberMg" INTEGER, "favorite" BOOLEAN NOT NULL DEFAULT true, "dataQuality" "LifeNutritionDataQuality" NOT NULL DEFAULT 'KNOWN', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeFood_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LifeMeal" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeMeal_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LifeMealItem" ("mealId" TEXT NOT NULL, "foodId" TEXT NOT NULL, "quantityMilli" INTEGER NOT NULL, "position" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "LifeMealItem_pkey" PRIMARY KEY ("mealId","foodId"));
CREATE TABLE "LifeFoodLog" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "foodId" TEXT, "localDate" TEXT NOT NULL, "mealSlot" "LifeMealSlot" NOT NULL, "quantityMilli" INTEGER NOT NULL, "nameSnapshot" TEXT NOT NULL, "servingLabelSnapshot" TEXT NOT NULL, "caloriesMilliSnapshot" INTEGER, "proteinMgSnapshot" INTEGER, "carbsMgSnapshot" INTEGER, "fatMgSnapshot" INTEGER, "fiberMgSnapshot" INTEGER, "mealBatchId" TEXT, "dataQualitySnapshot" "LifeNutritionDataQuality" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeFoodLog_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "LifeWeightEntry_userId_localDate_key" ON "LifeWeightEntry"("userId", "localDate");
CREATE INDEX "LifeWeightEntry_userId_localDate_idx" ON "LifeWeightEntry"("userId", "localDate");
CREATE UNIQUE INDEX "LifeFood_userId_source_externalId_key" ON "LifeFood"("userId", "source", "externalId");
CREATE INDEX "LifeFood_userId_favorite_idx" ON "LifeFood"("userId", "favorite");
CREATE INDEX "LifeMeal_userId_name_idx" ON "LifeMeal"("userId", "name");
CREATE INDEX "LifeMealItem_foodId_idx" ON "LifeMealItem"("foodId");
CREATE INDEX "LifeFoodLog_userId_localDate_idx" ON "LifeFoodLog"("userId", "localDate");
CREATE INDEX "LifeFoodLog_mealBatchId_idx" ON "LifeFoodLog"("mealBatchId");
CREATE INDEX "LifeFoodLog_foodId_idx" ON "LifeFoodLog"("foodId");
