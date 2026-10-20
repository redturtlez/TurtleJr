"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/database";
import { estimateMaintenance, kilogramsToGrams, poundsToGrams, proposeCalorieTarget, proposeProteinTarget } from "./nutrition";
import { fetchUsdaFood, searchUsda, type UsdaSearchResult } from "./usda";
import { lookupBarcode } from "./barcodeLookup";
import type { BarcodeFoodDraft } from "./barcodeData";
import { foodLogSchema, foodLogUpdateSchema, foodSchema, groceryStateSchema, mealLogSchema, mealPlanSchema, mealSchema, nutritionFeedbackSchema, nutritionSettingsSchema, recipeSchema, weightEntrySchema } from "./validation";

async function requireUserId(): Promise<string> { const { userId } = await auth(); if (!userId) throw new Error("You must be signed in to update nutrition"); return userId; }
const milli = (value: number | null): number | null => value === null ? null : Math.round(value * 1000);
const whole = (value: number | null): number | null => value === null ? null : Math.round(value);
const refresh = (): void => revalidatePath("/health");
const uniqueTerms = (values: string[]): string[] => [...new Map(values.map((value) => [value.trim().toLocaleLowerCase(), value.trim()])).values()];

export async function saveWeight(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = weightEntrySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid weight entry");
  const weightGrams = parsed.data.unit === "LB" ? poundsToGrams(parsed.data.value) : kilogramsToGrams(parsed.data.value);
  await prisma.lifeWeightEntry.upsert({ where: { userId_localDate: { userId, localDate: parsed.data.localDate } }, update: { weightGrams, note: parsed.data.note || null }, create: { userId, localDate: parsed.data.localDate, weightGrams, note: parsed.data.note || null } }); refresh();
}

export async function saveNutritionSettings(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = nutritionSettingsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid nutrition targets");
  const d = parsed.data; const targetWeightGrams = d.targetWeight === null ? null : d.weightUnit === "LB" ? poundsToGrams(d.targetWeight) : kilogramsToGrams(d.targetWeight);
  const values = { weightUnit: d.weightUnit, targetWeightGrams, calorieTargetMilli: milli(d.calorieTarget), proteinTargetMg: milli(d.proteinTarget), carbsTargetMg: milli(d.carbsTarget), fatTargetMg: milli(d.fatTarget), fiberTargetMg: milli(d.fiberTarget), calciumTargetMcg: milli(d.calciumTarget), potassiumTargetMcg: milli(d.potassiumTarget), magnesiumTargetMcg: milli(d.magnesiumTarget), ironTargetMcg: milli(d.ironTarget), vitaminDTargetMcg: whole(d.vitaminDTarget), vitaminB12TargetMcg: whole(d.vitaminB12Target), omega3TargetMcg: milli(d.omega3Target), avoidSeafood: d.avoidSeafood, avoidMushrooms: d.avoidMushrooms, maxPrepMinutes: d.maxPrepMinutes, preferredComplexity: d.preferredComplexity, ageYears: d.ageYears, heightMillimeters: d.heightInches === null ? null : Math.round(d.heightInches * 25.4), energyEquationSex: d.energyEquationSex, activityLevel: d.activityLevel, resistanceTraining: d.resistanceTraining, targetWeeklyLossGrams: d.targetWeeklyLossPounds === null ? null : poundsToGrams(d.targetWeeklyLossPounds), preferredFoods: uniqueTerms(d.preferredFoods), acceptableFoods: uniqueTerms(d.acceptableFoods), avoidedFoods: uniqueTerms(d.avoidedFoods), preferenceProfileSet: true };
  await prisma.lifeNutritionSettings.upsert({ where: { userId }, update: values, create: { userId, ...values } }); refresh();
}

export async function acceptNutritionProposal(): Promise<void> {
  const userId = await requireUserId();
  const [settings, weight] = await Promise.all([prisma.lifeNutritionSettings.findUnique({ where: { userId } }), prisma.lifeWeightEntry.findFirst({ where: { userId }, orderBy: { localDate: "desc" } })]);
  if (!settings || !weight || !settings.ageYears || !settings.heightMillimeters || !settings.energyEquationSex || !settings.activityLevel || !settings.targetWeeklyLossGrams) throw new Error("Save a complete profile and current weight first");
  const maintenance = estimateMaintenance({ weightGrams: weight.weightGrams, heightMillimeters: settings.heightMillimeters, ageYears: settings.ageYears, sex: settings.energyEquationSex, activityLevel: settings.activityLevel });
  const calories = proposeCalorieTarget({ maintenanceCalories: maintenance.maintenanceCalories, currentWeightGrams: weight.weightGrams, requestedWeeklyLossGrams: settings.targetWeeklyLossGrams, sex: settings.energyEquationSex });
  const protein = settings.targetWeightGrams && settings.resistanceTraining !== null ? proposeProteinTarget({ goalWeightGrams: settings.targetWeightGrams, resistanceTraining: settings.resistanceTraining }) : null;
  await prisma.lifeNutritionSettings.update({ where: { userId }, data: { calorieTargetMilli: calories.targetCalories * 1000, ...(protein ? { proteinTargetMg: protein.targetGrams * 1000 } : {}) } }); refresh();
}

export async function createFood(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = foodSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid food"); const d = parsed.data;
  await prisma.lifeFood.create({ data: { userId, name: d.name, brand: d.brand || null, servingLabel: d.servingLabel, servingGramsMilli: milli(d.servingGrams), caloriesMilli: milli(d.calories), proteinMg: milli(d.protein), carbsMg: milli(d.carbs), fatMg: milli(d.fat), fiberMg: milli(d.fiber), waterMg: milli(d.water), calciumMcg: milli(d.calcium), potassiumMcg: milli(d.potassium), magnesiumMcg: milli(d.magnesium), ironMcg: milli(d.iron), vitaminDMcg: whole(d.vitaminD), vitaminB12Mcg: whole(d.vitaminB12), omega3Mcg: milli(d.omega3), dataQuality: d.dataQuality } }); refresh();
}

export async function searchUsdaFoods(input: unknown): Promise<UsdaSearchResult[]> {
  await requireUserId(); const parsed = z.object({ query: z.string().trim().min(2).max(100), scope: z.enum(["ALL", "GENERIC", "BRANDED"]), completeOnly: z.boolean(), includeDuplicates: z.boolean() }).safeParse(input);
  if (!parsed.success) throw new Error("Enter at least two search characters"); return searchUsda(parsed.data.query, parsed.data);
}

export async function importUsdaFood(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = z.number().int().positive().safeParse(input); if (!parsed.success) throw new Error("Invalid USDA food");
  const food = await fetchUsdaFood(parsed.data);
  const { nutrients } = food; const details = { externalId: food.externalId, name: food.name, brand: food.brand, servingLabel: food.servingLabel, servingGramsMilli: food.servingGramsMilli };
  await prisma.lifeFood.upsert({ where: { userId_source_externalId: { userId, source: "USDA", externalId: food.externalId } }, update: { ...details, ...nutrients, dataQuality: "KNOWN", favorite: true }, create: { userId, source: "USDA", ...details, ...nutrients, dataQuality: "KNOWN" } }); refresh();
}

export async function lookupFoodBarcode(input: unknown): Promise<{ draft: BarcodeFoodDraft | null; error: string | null }> {
  await requireUserId(); const parsed = z.string().trim().regex(/^\d{6,14}$/).safeParse(input);
  if (!parsed.success) return { draft: null, error: "Enter the 6–14 barcode digits printed below the bars." };
  try { return { draft: await lookupBarcode(parsed.data), error: null }; }
  catch (error) {
    const message = error instanceof Error ? error.message : "Barcode lookup failed";
    const allowed = ["No nutrition product was found for this barcode. You can add it manually instead.", "Open Food Facts is unavailable", "Open Food Facts is temporarily rate limited"];
    return { draft: null, error: allowed.includes(message) ? message : "This barcode could not be looked up. Check the digits and enter it manually." };
  }
}

const scannedFoodSchema = z.object({
  barcode: z.string().regex(/^\d{6,14}$/), source: z.enum(["USDA", "OPEN_FOOD_FACTS"]), externalId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200), brand: z.string().trim().max(200).nullable(), servingLabel: z.string().trim().min(1).max(100),
  servingGrams: z.number().positive().max(100_000).nullable(), calories: z.number().min(0).max(100_000).nullable(),
  protein: z.number().min(0).max(10_000).nullable(), carbs: z.number().min(0).max(10_000).nullable(), fat: z.number().min(0).max(10_000).nullable(), fiber: z.number().min(0).max(10_000).nullable(), water: z.number().min(0).max(100_000).nullable(),
  calcium: z.number().min(0).max(1_000_000).nullable(), potassium: z.number().min(0).max(1_000_000).nullable(), magnesium: z.number().min(0).max(1_000_000).nullable(), iron: z.number().min(0).max(1_000_000).nullable(), omega3: z.number().min(0).max(1_000_000).nullable(),
  vitaminD: z.number().min(0).max(1_000_000).nullable(), vitaminB12: z.number().min(0).max(1_000_000).nullable(),
});

export async function saveScannedFood(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = scannedFoodSchema.safeParse(input); if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid scanned food");
  const d = parsed.data;
  const values = { source: d.source, externalId: d.externalId, barcode: d.barcode, name: d.name, brand: d.brand || null, servingLabel: d.servingLabel, servingGramsMilli: milli(d.servingGrams), caloriesMilli: milli(d.calories), proteinMg: milli(d.protein), carbsMg: milli(d.carbs), fatMg: milli(d.fat), fiberMg: milli(d.fiber), waterMg: milli(d.water), calciumMcg: milli(d.calcium), potassiumMcg: milli(d.potassium), magnesiumMcg: milli(d.magnesium), ironMcg: milli(d.iron), vitaminDMcg: whole(d.vitaminD), vitaminB12Mcg: whole(d.vitaminB12), omega3Mcg: milli(d.omega3), dataQuality: "KNOWN" as const, favorite: true };
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.lifeFood.findFirst({ where: { userId, OR: [{ barcode: d.barcode }, { source: d.source, externalId: d.externalId }] }, select: { id: true } });
    if (existing) await transaction.lifeFood.update({ where: { id: existing.id }, data: values });
    else await transaction.lifeFood.create({ data: { userId, ...values } });
  });
  refresh();
}

export async function logFood(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = foodLogSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid food log");
  const food = await prisma.lifeFood.findFirst({ where: { id: parsed.data.foodId, userId } });
  if (!food) throw new Error("Food not found"); await prisma.lifeFoodLog.create({ data: { userId, foodId: food.id, localDate: parsed.data.localDate, mealSlot: parsed.data.mealSlot, quantityMilli: Math.round(parsed.data.quantity * 1000), nameSnapshot: food.name, servingLabelSnapshot: food.servingLabel, caloriesMilliSnapshot: food.caloriesMilli, proteinMgSnapshot: food.proteinMg, carbsMgSnapshot: food.carbsMg, fatMgSnapshot: food.fatMg, fiberMgSnapshot: food.fiberMg, waterMgSnapshot: food.waterMg, calciumMcgSnapshot: food.calciumMcg, potassiumMcgSnapshot: food.potassiumMcg, magnesiumMcgSnapshot: food.magnesiumMcg, ironMcgSnapshot: food.ironMcg, vitaminDMcgSnapshot: food.vitaminDMcg, vitaminB12McgSnapshot: food.vitaminB12Mcg, omega3McgSnapshot: food.omega3Mcg, dataQualitySnapshot: food.dataQuality } }); refresh();
}

export async function updateFoodLog(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = foodLogUpdateSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid food log update");
  const result = await prisma.lifeFoodLog.updateMany({ where: { id: parsed.data.id, userId }, data: { localDate: parsed.data.localDate, mealSlot: parsed.data.mealSlot, quantityMilli: Math.round(parsed.data.quantity * 1000) } });
  if (!result.count) throw new Error("Food log not found"); refresh();
}

export async function deleteFoodLog(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = z.string().cuid().safeParse(input); if (!parsed.success) throw new Error("Invalid food log");
  const result = await prisma.lifeFoodLog.deleteMany({ where: { id: parsed.data, userId } });
  if (!result.count) throw new Error("Food log not found"); refresh();
}

export async function removeSavedFood(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = z.string().cuid().safeParse(input); if (!parsed.success) throw new Error("Invalid food");
  const result = await prisma.lifeFood.updateMany({ where: { id: parsed.data, userId, favorite: true }, data: { favorite: false } });
  if (!result.count) throw new Error("Saved food not found"); refresh();
}

export async function restoreSavedFood(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = z.string().cuid().safeParse(input); if (!parsed.success) throw new Error("Invalid food");
  const result = await prisma.lifeFood.updateMany({ where: { id: parsed.data, userId, favorite: false }, data: { favorite: true } });
  if (!result.count) throw new Error("Removed food not found"); refresh();
}

export async function createMeal(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = mealSchema.safeParse(input); if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid meal");
  const ids = parsed.data.items.map((item) => item.foodId); if (new Set(ids).size !== ids.length) throw new Error("Choose each food once per meal");
  if (await prisma.lifeFood.count({ where: { userId, id: { in: ids } } }) !== ids.length) throw new Error("One or more foods are unavailable");
  await prisma.lifeMeal.create({ data: { userId, name: parsed.data.name, pinned: parsed.data.pinned, defaultMealSlot: parsed.data.defaultMealSlot, items: { create: parsed.data.items.map((item, position) => ({ foodId: item.foodId, quantityMilli: Math.round(item.quantity * 1000), position })) } } }); refresh();
}

export async function deleteMeal(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = z.string().cuid().safeParse(input); if (!parsed.success) throw new Error("Invalid meal");
  const deleted = await prisma.$transaction(async (transaction) => {
    const result = await transaction.lifeMeal.deleteMany({ where: { id: parsed.data, userId } });
    if (result.count) await transaction.lifeNutritionFeedback.deleteMany({ where: { userId, targetType: "MEAL", targetId: parsed.data } });
    return result.count;
  });
  if (!deleted) throw new Error("Meal not found"); refresh();
}

export async function logMeal(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = mealLogSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid meal log");
  const meal = await prisma.lifeMeal.findFirst({ where: { id: parsed.data.mealId, userId }, select: { items: { include: { food: true } } } }); if (!meal) throw new Error("Meal not found");
  const batch = crypto.randomUUID(); await prisma.$transaction(meal.items.map((item) => prisma.lifeFoodLog.create({ data: { userId, foodId: item.food.id, localDate: parsed.data.localDate, mealSlot: parsed.data.mealSlot, quantityMilli: Math.round(item.quantityMilli * parsed.data.quantity), nameSnapshot: item.food.name, servingLabelSnapshot: item.food.servingLabel, caloriesMilliSnapshot: item.food.caloriesMilli, proteinMgSnapshot: item.food.proteinMg, carbsMgSnapshot: item.food.carbsMg, fatMgSnapshot: item.food.fatMg, fiberMgSnapshot: item.food.fiberMg, waterMgSnapshot: item.food.waterMg, calciumMcgSnapshot: item.food.calciumMcg, potassiumMcgSnapshot: item.food.potassiumMcg, magnesiumMcgSnapshot: item.food.magnesiumMcg, ironMcgSnapshot: item.food.ironMcg, vitaminDMcgSnapshot: item.food.vitaminDMcg, vitaminB12McgSnapshot: item.food.vitaminB12Mcg, omega3McgSnapshot: item.food.omega3Mcg, mealBatchId: batch, dataQualitySnapshot: item.food.dataQuality } }))); refresh();
}

export async function saveNutritionFeedback(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = nutritionFeedbackSchema.safeParse(input); if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid rating");
  const d = parsed.data;
  const target = d.targetType === "FOOD" ? await prisma.lifeFood.findFirst({ where: { id: d.targetId, userId }, select: { id: true, name: true } }) : d.targetType === "MEAL" ? await prisma.lifeMeal.findFirst({ where: { id: d.targetId, userId }, select: { id: true, name: true } }) : await prisma.lifeRecipe.findFirst({ where: { id: d.targetId, userId }, select: { id: true, name: true } });
  if (!target) throw new Error("Rating target not found");
  const values = { targetNameSnapshot: target.name, fullness: d.fullness, enjoyment: d.enjoyment, convenience: d.convenience, eatAgain: d.eatAgain };
  await prisma.lifeNutritionFeedback.upsert({ where: { userId_targetType_targetId: { userId, targetType: d.targetType, targetId: target.id } }, update: values, create: { userId, targetType: d.targetType, targetId: target.id, ...values } }); refresh();
}

export async function createRecipe(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = recipeSchema.safeParse(input); if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid recipe");
  const ids = parsed.data.ingredients.map((item) => item.foodId); if (new Set(ids).size !== ids.length) throw new Error("Choose each ingredient once");
  if (await prisma.lifeFood.count({ where: { userId, id: { in: ids } } }) !== ids.length) throw new Error("One or more ingredients are unavailable");
  await prisma.lifeRecipe.create({ data: { userId, name: parsed.data.name, instructions: parsed.data.instructions, tags: parsed.data.tags, servings: parsed.data.servings, prepMinutes: parsed.data.prepMinutes, complexity: parsed.data.complexity, ingredients: { create: parsed.data.ingredients.map((item, position) => ({ foodId: item.foodId, quantityMilli: Math.round(item.quantity * 1000), position })) } } }); refresh();
}

export async function saveMealPlanEntry(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = mealPlanSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid meal plan entry");
  const recipe = await prisma.lifeRecipe.findFirst({ where: { id: parsed.data.recipeId, userId }, select: { id: true } }); if (!recipe) throw new Error("Recipe not found");
  await prisma.lifeMealPlanEntry.upsert({ where: { userId_localDate_mealSlot: { userId, localDate: parsed.data.localDate, mealSlot: parsed.data.mealSlot } }, update: { recipeId: recipe.id, servingsMilli: Math.round(parsed.data.servings * 1000) }, create: { userId, localDate: parsed.data.localDate, mealSlot: parsed.data.mealSlot, recipeId: recipe.id, servingsMilli: Math.round(parsed.data.servings * 1000) } }); refresh();
}

export async function saveGroceryState(input: unknown): Promise<void> {
  const userId = await requireUserId(); const parsed = groceryStateSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid grocery item");
  const food = await prisma.lifeFood.findFirst({ where: { id: parsed.data.foodId, userId }, select: { id: true } }); if (!food) throw new Error("Food not found");
  await prisma.lifeGroceryState.upsert({ where: { userId_weekStart_foodId: { userId, weekStart: parsed.data.weekStart, foodId: food.id } }, update: { inPantry: parsed.data.inPantry, purchased: parsed.data.purchased }, create: { userId, weekStart: parsed.data.weekStart, foodId: food.id, inPantry: parsed.data.inPantry, purchased: parsed.data.purchased } }); refresh();
}
