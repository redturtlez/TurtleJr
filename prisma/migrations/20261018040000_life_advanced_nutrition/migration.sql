CREATE TYPE "LifeRecipeComplexity" AS ENUM ('SIMPLE', 'MODERATE', 'INVOLVED');

ALTER TABLE "LifeNutritionSettings" ADD COLUMN "calciumTargetMcg" INTEGER, ADD COLUMN "potassiumTargetMcg" INTEGER, ADD COLUMN "magnesiumTargetMcg" INTEGER, ADD COLUMN "ironTargetMcg" INTEGER, ADD COLUMN "vitaminDTargetMcg" INTEGER, ADD COLUMN "vitaminB12TargetMcg" INTEGER, ADD COLUMN "omega3TargetMcg" INTEGER, ADD COLUMN "avoidSeafood" BOOLEAN NOT NULL DEFAULT true, ADD COLUMN "avoidMushrooms" BOOLEAN NOT NULL DEFAULT true, ADD COLUMN "maxPrepMinutes" INTEGER NOT NULL DEFAULT 45, ADD COLUMN "preferredComplexity" "LifeRecipeComplexity" NOT NULL DEFAULT 'SIMPLE';

ALTER TABLE "LifeFood" ADD COLUMN "calciumMcg" INTEGER, ADD COLUMN "potassiumMcg" INTEGER, ADD COLUMN "magnesiumMcg" INTEGER, ADD COLUMN "ironMcg" INTEGER, ADD COLUMN "vitaminDMcg" INTEGER, ADD COLUMN "vitaminB12Mcg" INTEGER, ADD COLUMN "omega3Mcg" INTEGER;

ALTER TABLE "LifeFoodLog" ADD COLUMN "calciumMcgSnapshot" INTEGER, ADD COLUMN "potassiumMcgSnapshot" INTEGER, ADD COLUMN "magnesiumMcgSnapshot" INTEGER, ADD COLUMN "ironMcgSnapshot" INTEGER, ADD COLUMN "vitaminDMcgSnapshot" INTEGER, ADD COLUMN "vitaminB12McgSnapshot" INTEGER, ADD COLUMN "omega3McgSnapshot" INTEGER;

CREATE TABLE "LifeRecipe" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "instructions" TEXT NOT NULL, "tags" TEXT[] DEFAULT ARRAY[]::TEXT[], "servings" INTEGER NOT NULL, "prepMinutes" INTEGER, "complexity" "LifeRecipeComplexity" NOT NULL DEFAULT 'SIMPLE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeRecipe_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LifeRecipeIngredient" ("recipeId" TEXT NOT NULL, "foodId" TEXT NOT NULL, "quantityMilli" INTEGER NOT NULL, "position" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "LifeRecipeIngredient_pkey" PRIMARY KEY ("recipeId","foodId"));
CREATE TABLE "LifeMealPlanEntry" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "localDate" TEXT NOT NULL, "mealSlot" "LifeMealSlot" NOT NULL, "recipeId" TEXT NOT NULL, "servingsMilli" INTEGER NOT NULL DEFAULT 1000, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeMealPlanEntry_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LifeGroceryState" ("userId" TEXT NOT NULL, "weekStart" TEXT NOT NULL, "foodId" TEXT NOT NULL, "inPantry" BOOLEAN NOT NULL DEFAULT false, "purchased" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeGroceryState_pkey" PRIMARY KEY ("userId","weekStart","foodId"));

CREATE INDEX "LifeRecipe_userId_name_idx" ON "LifeRecipe"("userId", "name");
CREATE INDEX "LifeRecipeIngredient_foodId_idx" ON "LifeRecipeIngredient"("foodId");
CREATE UNIQUE INDEX "LifeMealPlanEntry_userId_localDate_mealSlot_key" ON "LifeMealPlanEntry"("userId", "localDate", "mealSlot");
CREATE INDEX "LifeMealPlanEntry_recipeId_idx" ON "LifeMealPlanEntry"("recipeId");
CREATE INDEX "LifeGroceryState_foodId_idx" ON "LifeGroceryState"("foodId");
