import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/database";
import { aggregateNutrients, buildNutritionInsightReview, estimateMaintenance, proposeCalorieTarget, proposeProteinTarget, rollingWeightAverage, type NutrientKey, type NutritionInsightReview } from "./nutrition";
import { shiftDateKey } from "./analytics";

export interface NutritionDashboardData {
  settings: { weightUnit: "LB" | "KG"; targetWeightGrams: number | null; calorieTargetMilli: number | null; proteinTargetMg: number | null; carbsTargetMg: number | null; fatTargetMg: number | null; fiberTargetMg: number | null; calciumTargetMcg: number | null; potassiumTargetMcg: number | null; magnesiumTargetMcg: number | null; ironTargetMcg: number | null; vitaminDTargetMcg: number | null; vitaminB12TargetMcg: number | null; omega3TargetMcg: number | null; avoidSeafood: boolean; avoidMushrooms: boolean; maxPrepMinutes: number; preferredComplexity: "SIMPLE" | "MODERATE" | "INVOLVED"; ageYears: number | null; heightMillimeters: number | null; energyEquationSex: "MALE" | "FEMALE" | null; activityLevel: "SEDENTARY" | "LIGHT" | "MODERATE" | "VERY_ACTIVE" | null; resistanceTraining: boolean | null; targetWeeklyLossGrams: number | null; preferredFoods: string[]; acceptableFoods: string[]; avoidedFoods: string[]; preferenceProfileSet: boolean };
  weights: Array<{ id: string; localDate: string; weightGrams: number; note: string | null }>;
  rollingWeightGrams: number | null;
  foods: Array<{ id: string; name: string; brand: string | null; servingLabel: string; servingGramsMilli: number | null; caloriesMilli: number | null; proteinMg: number | null; carbsMg: number | null; fatMg: number | null; fiberMg: number | null; calciumMcg: number | null; potassiumMcg: number | null; magnesiumMcg: number | null; ironMcg: number | null; vitaminDMcg: number | null; vitaminB12Mcg: number | null; omega3Mcg: number | null; waterMg: number | null; source: "MANUAL" | "USDA" | "OPEN_FOOD_FACTS"; externalId: string | null; dataQuality: "KNOWN" | "ESTIMATED" }>;
  removedFoods: Array<{ id: string; name: string; brand: string | null; source: "MANUAL" | "USDA" | "OPEN_FOOD_FACTS"; externalId: string | null }>;
  meals: Array<{ id: string; name: string; pinned: boolean; defaultMealSlot: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | null; caloriesMilli: number | null; proteinMg: number | null; items: Array<{ foodId: string; name: string; quantityMilli: number }> }>;
  logs: Array<{ id: string; localDate: string; mealSlot: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"; quantityMilli: number; name: string; servingLabel: string; dataQuality: "KNOWN" | "ESTIMATED"; caloriesMilli: number | null; proteinMg: number | null; carbsMg: number | null; fatMg: number | null; fiberMg: number | null; calciumMcg: number | null; potassiumMcg: number | null; magnesiumMcg: number | null; ironMcg: number | null; vitaminDMcg: number | null; vitaminB12Mcg: number | null; omega3Mcg: number | null; waterMg: number | null }>;
  feedback: Array<{ targetType: "FOOD" | "MEAL" | "RECIPE"; targetId: string; fullness: number | null; enjoyment: number | null; convenience: number | null; eatAgain: boolean | null }>;
  proposal: null | { rmrCalories: number; maintenanceCalories: number; lowCalories: number; highCalories: number; targetCalories: number; proteinGrams: number | null; proteinGramsPerKilogram: number | null; effectiveWeeklyLossGrams: number; minimumCalories: number; limited: boolean };
  summary: ReturnType<typeof aggregateNutrients>;
  missingCounts: Record<"caloriesMilli" | "proteinMg" | "carbsMg" | "fatMg" | "fiberMg", number>;
  insightReview: NutritionInsightReview;
}

export async function getNutritionDashboardData(localDate: string): Promise<NutritionDashboardData> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to view nutrition");
  const settings = await prisma.lifeNutritionSettings.upsert({ where: { userId }, update: {}, create: { userId } });
  const [weights, allFoods, meals, logs, feedback] = await Promise.all([
    prisma.lifeWeightEntry.findMany({ where: { userId }, orderBy: { localDate: "desc" }, take: 90, select: { id: true, localDate: true, weightGrams: true, note: true } }),
    prisma.lifeFood.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, brand: true, servingLabel: true, servingGramsMilli: true, caloriesMilli: true, proteinMg: true, carbsMg: true, fatMg: true, fiberMg: true, calciumMcg: true, potassiumMcg: true, magnesiumMcg: true, ironMcg: true, vitaminDMcg: true, vitaminB12Mcg: true, omega3Mcg: true, waterMg: true, source: true, externalId: true, dataQuality: true, favorite: true } }),
    prisma.lifeMeal.findMany({ where: { userId }, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }], select: { id: true, name: true, pinned: true, defaultMealSlot: true, items: { orderBy: { position: "asc" }, select: { foodId: true, quantityMilli: true, food: { select: { name: true, caloriesMilli: true, proteinMg: true } } } } } }),
    prisma.lifeFoodLog.findMany({ where: { userId, localDate: { gte: shiftDateKey(localDate, -29), lte: localDate } }, orderBy: [{ localDate: "desc" }, { createdAt: "asc" }], select: { id: true, localDate: true, mealSlot: true, quantityMilli: true, nameSnapshot: true, servingLabelSnapshot: true, dataQualitySnapshot: true, caloriesMilliSnapshot: true, proteinMgSnapshot: true, carbsMgSnapshot: true, fatMgSnapshot: true, fiberMgSnapshot: true, calciumMcgSnapshot: true, potassiumMcgSnapshot: true, magnesiumMcgSnapshot: true, ironMcgSnapshot: true, vitaminDMcgSnapshot: true, vitaminB12McgSnapshot: true, omega3McgSnapshot: true, waterMgSnapshot: true } }),
    prisma.lifeNutritionFeedback.findMany({ where: { userId }, select: { targetType: true, targetId: true, fullness: true, enjoyment: true, convenience: true, eatAgain: true } }),
  ]);
  const foods = allFoods.filter((food) => food.favorite).map(({ favorite: _favorite, ...food }) => food);
  const removedFoods = allFoods.filter((food) => !food.favorite).map((food) => ({ id: food.id, name: food.name, brand: food.brand, source: food.source, externalId: food.externalId }));
  const normalizedLogs = logs.map((log) => ({ id: log.id, localDate: log.localDate, mealSlot: log.mealSlot, quantityMilli: log.quantityMilli, name: log.nameSnapshot, servingLabel: log.servingLabelSnapshot, dataQuality: log.dataQualitySnapshot, caloriesMilli: log.caloriesMilliSnapshot, proteinMg: log.proteinMgSnapshot, carbsMg: log.carbsMgSnapshot, fatMg: log.fatMgSnapshot, fiberMg: log.fiberMgSnapshot, calciumMcg: log.calciumMcgSnapshot, potassiumMcg: log.potassiumMcgSnapshot, magnesiumMcg: log.magnesiumMcgSnapshot, ironMcg: log.ironMcgSnapshot, vitaminDMcg: log.vitaminDMcgSnapshot, vitaminB12Mcg: log.vitaminB12McgSnapshot, omega3Mcg: log.omega3McgSnapshot, waterMg: log.waterMgSnapshot }));
  const insightTargets: Partial<Record<NutrientKey, number | null>> = { proteinMg: settings.proteinTargetMg, fiberMg: settings.fiberTargetMg, calciumMcg: settings.calciumTargetMcg, potassiumMcg: settings.potassiumTargetMcg, magnesiumMcg: settings.magnesiumTargetMcg, ironMcg: settings.ironTargetMcg, vitaminDMcg: settings.vitaminDTargetMcg, vitaminB12Mcg: settings.vitaminB12TargetMcg, omega3Mcg: settings.omega3TargetMcg };
  const insightReview = buildNutritionInsightReview(normalizedLogs, insightTargets, localDate);
  const todayLogs = normalizedLogs.filter((log) => log.localDate === localDate);
  const latestWeight = weights[0]?.weightGrams ?? null;
  const maintenance = latestWeight && settings.ageYears && settings.heightMillimeters && settings.energyEquationSex && settings.activityLevel ? estimateMaintenance({ weightGrams: latestWeight, ageYears: settings.ageYears, heightMillimeters: settings.heightMillimeters, sex: settings.energyEquationSex, activityLevel: settings.activityLevel }) : null;
  const calorieProposal = maintenance && latestWeight && settings.energyEquationSex && settings.targetWeeklyLossGrams ? proposeCalorieTarget({ maintenanceCalories: maintenance.maintenanceCalories, currentWeightGrams: latestWeight, requestedWeeklyLossGrams: settings.targetWeeklyLossGrams, sex: settings.energyEquationSex }) : null;
  const proteinProposal = settings.targetWeightGrams && settings.resistanceTraining !== null ? proposeProteinTarget({ goalWeightGrams: settings.targetWeightGrams, resistanceTraining: settings.resistanceTraining }) : null;
  const mealFeedback = new Map(feedback.filter((item) => item.targetType === "MEAL").map((item) => [item.targetId, item]));
  const rankedMeals = meals.toSorted((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    const score = (id: string): number => { const item = mealFeedback.get(id); return (item?.fullness ?? 0) + (item?.enjoyment ?? 0) + (item?.convenience ?? 0) + (item?.eatAgain === true ? 5 : item?.eatAgain === false ? -5 : 0); };
    return score(right.id) - score(left.id);
  });
  return {
    settings: { ...settings, weightUnit: settings.weightUnit === "KG" ? "KG" : "LB" }, weights,
    rollingWeightGrams: rollingWeightAverage(weights, localDate), foods, removedFoods,
    meals: rankedMeals.map((meal) => ({ id: meal.id, name: meal.name, pinned: meal.pinned, defaultMealSlot: meal.defaultMealSlot,
      caloriesMilli: meal.items.some((item) => item.food.caloriesMilli === null) ? null : meal.items.reduce((sum, item) => sum + Math.round((item.food.caloriesMilli ?? 0) * item.quantityMilli / 1000), 0),
      proteinMg: meal.items.some((item) => item.food.proteinMg === null) ? null : meal.items.reduce((sum, item) => sum + Math.round((item.food.proteinMg ?? 0) * item.quantityMilli / 1000), 0),
      items: meal.items.map((item) => ({ foodId: item.foodId, name: item.food.name, quantityMilli: item.quantityMilli })) })),
    feedback,
    proposal: maintenance && calorieProposal ? { ...maintenance, targetCalories: calorieProposal.targetCalories, proteinGrams: proteinProposal?.targetGrams ?? null, proteinGramsPerKilogram: proteinProposal?.gramsPerKilogram ?? null, effectiveWeeklyLossGrams: calorieProposal.effectiveWeeklyLossGrams, minimumCalories: calorieProposal.minimumCalories, limited: calorieProposal.limited } : null,
    logs: normalizedLogs, summary: aggregateNutrients(todayLogs.map((log) => ({ ...log, quantityMilli: log.quantityMilli }))),
    missingCounts: { caloriesMilli: todayLogs.filter((item) => item.caloriesMilli === null).length, proteinMg: todayLogs.filter((item) => item.proteinMg === null).length, carbsMg: todayLogs.filter((item) => item.carbsMg === null).length, fatMg: todayLogs.filter((item) => item.fatMg === null).length, fiberMg: todayLogs.filter((item) => item.fiberMg === null).length },
    insightReview,
  };
}
