ALTER TYPE "LifeFoodSource" ADD VALUE IF NOT EXISTS 'OPEN_FOOD_FACTS';

ALTER TABLE "LifeFood" ADD COLUMN "barcode" TEXT;

CREATE UNIQUE INDEX "LifeFood_userId_barcode_key" ON "LifeFood"("userId", "barcode");
