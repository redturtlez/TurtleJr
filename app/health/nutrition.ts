export interface Nutrients {
  caloriesMilli: number | null;
  proteinMg: number | null;
  carbsMg: number | null;
  fatMg: number | null;
  fiberMg: number | null;
  calciumMcg?: number | null;
  potassiumMcg?: number | null;
  magnesiumMcg?: number | null;
  ironMcg?: number | null;
  vitaminDMcg?: number | null;
  vitaminB12Mcg?: number | null;
  omega3Mcg?: number | null;
  waterMg?: number | null;
}

export type FoodLogSlot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export interface FoodLogGroup<T> { localDate: string; meals: Array<{ mealSlot: FoodLogSlot; logs: T[] }> }

export function groupFoodLogs<T extends { localDate: string; mealSlot: FoodLogSlot }>(logs: T[]): FoodLogGroup<T>[] {
  const mealOrder: FoodLogSlot[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
  const dates = new Map<string, Map<FoodLogSlot, T[]>>();
  for (const log of logs) {
    const meals = dates.get(log.localDate) ?? new Map<FoodLogSlot, T[]>();
    const entries = meals.get(log.mealSlot) ?? [];
    entries.push(log); meals.set(log.mealSlot, entries); dates.set(log.localDate, meals);
  }
  return [...dates.entries()].toSorted(([left], [right]) => right.localeCompare(left)).map(([localDate, meals]) => ({
    localDate,
    meals: mealOrder.flatMap((mealSlot) => meals.has(mealSlot) ? [{ mealSlot, logs: meals.get(mealSlot)! }] : []),
  }));
}

export type NutrientKey = keyof Nutrients;

export function scaleNutrient(value: number | null, quantityMilli: number): number | null {
  return value === null ? null : Math.round((value * quantityMilli) / 1000);
}

export function scaleNutrients(nutrients: Nutrients, quantityMilli: number): Nutrients {
  return {
    caloriesMilli: scaleNutrient(nutrients.caloriesMilli, quantityMilli),
    proteinMg: scaleNutrient(nutrients.proteinMg, quantityMilli),
    carbsMg: scaleNutrient(nutrients.carbsMg, quantityMilli),
    fatMg: scaleNutrient(nutrients.fatMg, quantityMilli),
    fiberMg: scaleNutrient(nutrients.fiberMg, quantityMilli),
    calciumMcg: scaleNutrient(nutrients.calciumMcg ?? null, quantityMilli),
    potassiumMcg: scaleNutrient(nutrients.potassiumMcg ?? null, quantityMilli),
    magnesiumMcg: scaleNutrient(nutrients.magnesiumMcg ?? null, quantityMilli),
    ironMcg: scaleNutrient(nutrients.ironMcg ?? null, quantityMilli),
    vitaminDMcg: scaleNutrient(nutrients.vitaminDMcg ?? null, quantityMilli),
    vitaminB12Mcg: scaleNutrient(nutrients.vitaminB12Mcg ?? null, quantityMilli),
    omega3Mcg: scaleNutrient(nutrients.omega3Mcg ?? null, quantityMilli),
    waterMg: scaleNutrient(nutrients.waterMg ?? null, quantityMilli),
  };
}

export function aggregateNutrients(items: Array<Nutrients & { quantityMilli: number }>): Nutrients {
  const keys: NutrientKey[] = ["caloriesMilli", "proteinMg", "carbsMg", "fatMg", "fiberMg", "calciumMcg", "potassiumMcg", "magnesiumMcg", "ironMcg", "vitaminDMcg", "vitaminB12Mcg", "omega3Mcg", "waterMg"];
  return Object.fromEntries(keys.map((key) => {
    const known = items.map((item) => scaleNutrient(item[key] ?? null, item.quantityMilli)).filter((value): value is number => value !== null);
    return [key, known.length ? known.reduce((sum, value) => sum + value, 0) : null];
  })) as unknown as Nutrients;
}

export interface NutritionInsight {
  key: NutrientKey;
  label: string;
  percent: number;
  evidence: string;
}

export interface NutritionInsightReview {
  status: "INSUFFICIENT_LOGS" | "NO_TARGETS" | "LIMITED_DATA" | "READY" | "ON_TRACK";
  daysLogged: number;
  insights: NutritionInsight[];
}

export function buildNutritionInsightReview(
  logs: Array<Nutrients & { localDate: string; quantityMilli: number; dataQuality: "KNOWN" | "ESTIMATED" }>,
  targets: Partial<Record<NutrientKey, number | null>>,
  endDate: string,
): NutritionInsightReview {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() - 6);
  const startDate = end.toISOString().slice(0, 10);
  const recent = logs.filter((item) => item.localDate >= startDate && item.localDate <= endDate);
  const daysLogged = new Set(recent.map((item) => item.localDate)).size;
  if (daysLogged < 4) return { status: "INSUFFICIENT_LOGS", daysLogged, insights: [] };

  const candidates: Array<[NutrientKey, string]> = [
    ["proteinMg", "Protein"],
    ["fiberMg", "Fiber"],
    ["calciumMcg", "Calcium"],
    ["potassiumMcg", "Potassium"],
    ["magnesiumMcg", "Magnesium"],
    ["ironMcg", "Iron"],
    ["vitaminDMcg", "Vitamin D"],
    ["vitaminB12Mcg", "Vitamin B12"],
    ["omega3Mcg", "Omega-3"],
  ];
  const configured = candidates.filter(([key]) => (targets[key] ?? 0) > 0);
  if (!configured.length) return { status: "NO_TARGETS", daysLogged, insights: [] };

  const eligible = configured.flatMap(([key, label]) => {
    const target = targets[key];
    if (!target) return [];
    const known = recent.filter((item) => item[key] != null);
    if (!recent.length || known.length / recent.length < 0.8) return [];
    const estimated = known.filter((item) => item.dataQuality === "ESTIMATED").length;
    if (estimated / known.length > 0.5) return [];
    const total = known.reduce((sum, item) => sum + (scaleNutrient(item[key] ?? null, item.quantityMilli) ?? 0), 0);
    const percent = Math.round((total / (target * daysLogged)) * 100);
    return [{ key, label, percent }];
  });
  if (!eligible.length) return { status: "LIMITED_DATA", daysLogged, insights: [] };

  const insights = eligible
    .filter((item) => item.percent < 80)
    .toSorted((left, right) => left.percent - right.percent)
    .slice(0, 2)
    .map((item) => ({ ...item, evidence: `${item.label} averaged ${item.percent}% of your configured target across ${daysLogged} logged days.` }));
  return { status: insights.length ? "READY" : "ON_TRACK", daysLogged, insights };
}

export interface RecipeNutritionInput extends Nutrients { id: string; name: string; servings: number; prepMinutes: number | null; complexity: "SIMPLE" | "MODERATE" | "INVOLVED"; tags: string[]; ingredients: Array<Nutrients & { name: string; quantityMilli: number; servingGramsMilli?: number | null }>; }

export function recipeNutrients(recipe: Pick<RecipeNutritionInput, "ingredients" | "servings">): Nutrients {
  const total = aggregateNutrients(recipe.ingredients);
  return scaleNutrients(total, Math.round(1000 / recipe.servings));
}

export function recipeServingGrams(recipe: Pick<RecipeNutritionInput, "ingredients" | "servings">): number | null {
  if (recipe.ingredients.some((item) => item.servingGramsMilli == null)) return null;
  return recipe.ingredients.reduce((sum, item) => sum + ((item.servingGramsMilli ?? 0) / 1000) * (item.quantityMilli / 1000), 0) / recipe.servings;
}

export function recommendRecipes(recipes: RecipeNutritionInput[], targets: Partial<Record<NutrientKey, number | null>>, consumed: Nutrients, preferences: { avoidSeafood: boolean; avoidMushrooms: boolean; maxPrepMinutes: number; preferredComplexity: "SIMPLE" | "MODERATE" | "INVOLVED"; preferredFoods?: string[]; acceptableFoods?: string[]; avoidedFoods?: string[]; ratings?: Record<string, { fullness: number | null; enjoyment: number | null; convenience: number | null; eatAgain: boolean | null }> }): Array<{ id: string; score: number; reasons: string[] }> {
  const avoidedTerms = (preferences.avoidedFoods ?? []).map((item) => item.trim().toLocaleLowerCase()).filter(Boolean);
  const preferredTerms = (preferences.preferredFoods ?? []).map((item) => item.trim().toLocaleLowerCase()).filter(Boolean);
  const avoid = [preferences.avoidSeafood ? /fish|seafood|shrimp|salmon|tuna/i : null, preferences.avoidMushrooms ? /mushroom/i : null].filter((item): item is RegExp => item !== null);
  return recipes.flatMap((recipe) => {
    if (recipe.prepMinutes && recipe.prepMinutes > preferences.maxPrepMinutes) return [];
    const searchable = [recipe.name, ...recipe.tags, ...recipe.ingredients.map((item) => item.name)].join(" ").toLocaleLowerCase();
    if (avoid.some((pattern) => pattern.test(searchable)) || avoidedTerms.some((term) => searchable.includes(term))) return [];
    const nutrients = recipeNutrients(recipe); const reasons: string[] = []; let score = recipe.complexity === preferences.preferredComplexity ? 10 : 0;
    const servingGrams = recipeServingGrams(recipe);
    if (servingGrams !== null && nutrients.caloriesMilli !== null && servingGrams >= 250 && (nutrients.caloriesMilli / 1000 / servingGrams) * 100 <= 150) { score += 12; reasons.push("lower calorie density from saved serving weights"); }
    if (preferredTerms.some((term) => searchable.includes(term))) { score += 12; reasons.push("uses a preferred food"); }
    const rating = preferences.ratings?.[recipe.id];
    if (rating) {
      score += (rating.fullness ?? 0) * 2 + (rating.enjoyment ?? 0) + (rating.convenience ?? 0) + (rating.eatAgain === true ? 5 : rating.eatAgain === false ? -8 : 0);
      if ((rating.fullness ?? 0) >= 4) reasons.push("you rated it filling");
      if (rating.eatAgain === true) reasons.push("you would eat it again");
    }
    for (const [key, label] of [["proteinMg", "protein"], ["fiberMg", "fiber"], ["calciumMcg", "calcium"], ["potassiumMcg", "potassium"], ["magnesiumMcg", "magnesium"], ["ironMcg", "iron"], ["vitaminDMcg", "vitamin D"], ["vitaminB12Mcg", "vitamin B12"]] as Array<[NutrientKey, string]>) {
      const target = targets[key]; const current = consumed[key] ?? null; const value = nutrients[key] ?? null;
      if (target && current !== null && current < target && value !== null && value > 0) { const contribution = Math.min(30, Math.round((value / (target - current)) * 20)); score += contribution; if (contribution >= 4) reasons.push(`adds ${label}`); }
    }
    const calorieTarget = targets.caloriesMilli; const calories = nutrients.caloriesMilli;
    if (calorieTarget && consumed.caloriesMilli !== null && calories !== null && calories <= Math.max(0, calorieTarget - consumed.caloriesMilli)) { score += 15; reasons.push("fits remaining calories"); }
    if (!reasons.length) reasons.push("fits your saved preferences");
    return [{ id: recipe.id, score, reasons: reasons.slice(0, 3) }];
  }).toSorted((left, right) => right.score - left.score).slice(0, 5);
}

export type EnergyEquationSex = "MALE" | "FEMALE";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "VERY_ACTIVE";

const activityMultipliers: Record<ActivityLevel, number> = { SEDENTARY: 1.2, LIGHT: 1.375, MODERATE: 1.55, VERY_ACTIVE: 1.725 };

export function mifflinStJeorRmr(input: { weightGrams: number; heightMillimeters: number; ageYears: number; sex: EnergyEquationSex }): number {
  const kilograms = input.weightGrams / 1000;
  const centimeters = input.heightMillimeters / 10;
  return Math.round((10 * kilograms) + (6.25 * centimeters) - (5 * input.ageYears) + (input.sex === "MALE" ? 5 : -161));
}

export function estimateMaintenance(input: { weightGrams: number; heightMillimeters: number; ageYears: number; sex: EnergyEquationSex; activityLevel: ActivityLevel }): { rmrCalories: number; maintenanceCalories: number; lowCalories: number; highCalories: number } {
  const rmrCalories = mifflinStJeorRmr(input);
  const maintenanceCalories = Math.round(rmrCalories * activityMultipliers[input.activityLevel]);
  return { rmrCalories, maintenanceCalories, lowCalories: Math.round(maintenanceCalories * 0.9), highCalories: Math.round(maintenanceCalories * 1.1) };
}

export function proposeCalorieTarget(input: { maintenanceCalories: number; currentWeightGrams: number; requestedWeeklyLossGrams: number; sex: EnergyEquationSex }): { targetCalories: number; nominalDailyDeficit: number; effectiveWeeklyLossGrams: number; maximumWeeklyLossGrams: number; minimumCalories: number; limited: boolean } {
  const minimumCalories = input.sex === "MALE" ? 1500 : 1200;
  const maximumWeeklyLossGrams = Math.max(0, Math.round(Math.min(907, input.currentWeightGrams * 0.01)));
  const boundedLoss = Math.max(0, Math.min(input.requestedWeeklyLossGrams, maximumWeeklyLossGrams));
  const nominalDailyDeficit = Math.round((boundedLoss * 7.7) / 7);
  const targetCalories = Math.max(minimumCalories, input.maintenanceCalories - nominalDailyDeficit);
  const effectiveWeeklyLossGrams = Math.max(0, Math.round(((input.maintenanceCalories - targetCalories) * 7) / 7.7));
  return { targetCalories, nominalDailyDeficit, effectiveWeeklyLossGrams, maximumWeeklyLossGrams, minimumCalories, limited: boundedLoss !== input.requestedWeeklyLossGrams || targetCalories === minimumCalories };
}

export function proposeProteinTarget(input: { goalWeightGrams: number; resistanceTraining: boolean }): { targetGrams: number; gramsPerKilogram: number } {
  const gramsPerKilogram = input.resistanceTraining ? 1.6 : 1.3;
  return { targetGrams: Math.round(((input.goalWeightGrams / 1000) * gramsPerKilogram) / 5) * 5, gramsPerKilogram };
}

export interface ComparableFood extends Nutrients {
  id: string;
  name: string;
  servingGramsMilli: number | null;
}

export function foodDensity(food: Pick<ComparableFood, "servingGramsMilli" | "caloriesMilli" | "proteinMg" | "fiberMg" | "waterMg">): { caloriesPer100Grams: number | null; proteinGramsPer100Calories: number | null; fiberGramsPer100Calories: number | null; waterPercent: number | null } {
  const servingGrams = food.servingGramsMilli === null ? null : food.servingGramsMilli / 1000;
  const calories = food.caloriesMilli === null ? null : food.caloriesMilli / 1000;
  return {
    caloriesPer100Grams: servingGrams && calories !== null ? (calories / servingGrams) * 100 : null,
    proteinGramsPer100Calories: calories && food.proteinMg !== null ? ((food.proteinMg / 1000) / calories) * 100 : null,
    fiberGramsPer100Calories: calories && food.fiberMg !== null ? ((food.fiberMg / 1000) / calories) * 100 : null,
    waterPercent: food.waterMg != null && food.servingGramsMilli ? (food.waterMg / food.servingGramsMilli) * 100 : null,
  };
}

export interface SubstitutionSuggestion { id: string; name: string; equivalentGrams: number | null; reasons: string[]; confidence: "LIMITED" | "MODERATE" | "HIGH"; }

export function recommendFoodSubstitutions(base: ComparableFood, candidates: ComparableFood[], preferences: { preferredFoods: string[]; acceptableFoods: string[]; avoidedFoods: string[] }): SubstitutionSuggestion[] {
  if (!base.caloriesMilli || !base.servingGramsMilli) return [];
  const baseCaloriesMilli = base.caloriesMilli;
  const baseServingGramsMilli = base.servingGramsMilli;
  const baseDensity = foodDensity(base);
  const normalizedAvoided = preferences.avoidedFoods.map((item) => item.toLocaleLowerCase());
  const normalizedPreferred = [...preferences.preferredFoods, ...preferences.acceptableFoods].map((item) => item.toLocaleLowerCase());
  return candidates.flatMap((candidate) => {
    if (candidate.id === base.id || !candidate.caloriesMilli || !candidate.servingGramsMilli || normalizedAvoided.some((term) => term && candidate.name.toLocaleLowerCase().includes(term))) return [];
    const calorieRatio = baseCaloriesMilli / candidate.caloriesMilli;
    const equivalentGrams = (candidate.servingGramsMilli / 1000) * calorieRatio;
    const reasons: string[] = [];
    const candidateDensity = foodDensity(candidate);
    if (equivalentGrams >= (baseServingGramsMilli / 1000) * 1.25) reasons.push("more food weight at similar calories");
    if (baseDensity.proteinGramsPer100Calories !== null && candidateDensity.proteinGramsPer100Calories !== null && candidateDensity.proteinGramsPer100Calories >= baseDensity.proteinGramsPer100Calories * 1.2) reasons.push("more protein per calorie");
    if (baseDensity.fiberGramsPer100Calories !== null && candidateDensity.fiberGramsPer100Calories !== null && candidateDensity.fiberGramsPer100Calories >= Math.max(1, baseDensity.fiberGramsPer100Calories * 1.2)) reasons.push("more fiber per calorie");
    if (normalizedPreferred.some((term) => term && candidate.name.toLocaleLowerCase().includes(term))) reasons.push("matches your food preferences");
    if (!reasons.length) return [];
    const known = [candidateDensity.caloriesPer100Grams, candidateDensity.proteinGramsPer100Calories, candidateDensity.fiberGramsPer100Calories, candidateDensity.waterPercent].filter((value) => value !== null).length;
    const score = (reasons.includes("more food weight at similar calories") ? 30 : 0) + (reasons.includes("more protein per calorie") ? 20 : 0) + (reasons.includes("more fiber per calorie") ? 15 : 0) + (reasons.includes("matches your food preferences") ? 10 : 0);
    return [{ id: candidate.id, name: candidate.name, equivalentGrams: Math.round(equivalentGrams), reasons: reasons.slice(0, 3), confidence: known >= 4 ? "HIGH" as const : known >= 2 ? "MODERATE" as const : "LIMITED" as const, score }];
  }).toSorted((left, right) => right.score - left.score).slice(0, 5).map(({ score: _score, ...item }) => item);
}

export function aggregateGroceryItems(entries: Array<{ servingsMilli: number; ingredients: Array<{ foodId: string; name: string; servingLabel: string; quantityMilli: number }> }>): Array<{ foodId: string; name: string; servingLabel: string; quantityMilli: number }> {
  const result = new Map<string, { foodId: string; name: string; servingLabel: string; quantityMilli: number }>();
  for (const entry of entries) for (const item of entry.ingredients) { const existing = result.get(item.foodId); const quantity = Math.round(item.quantityMilli * entry.servingsMilli / 1000); if (existing) existing.quantityMilli += quantity; else result.set(item.foodId, { foodId: item.foodId, name: item.name, servingLabel: item.servingLabel, quantityMilli: quantity }); }
  return [...result.values()].toSorted((a, b) => a.name.localeCompare(b.name));
}

export function poundsToGrams(pounds: number): number { return Math.round(pounds * 453.59237); }
export function kilogramsToGrams(kilograms: number): number { return Math.round(kilograms * 1000); }
export function gramsToWeight(grams: number, unit: "LB" | "KG"): number { return unit === "LB" ? grams / 453.59237 : grams / 1000; }

export function rollingWeightAverage(entries: Array<{ localDate: string; weightGrams: number }>, endDate: string, days = 7): number | null {
  const cutoff = new Date(`${endDate}T00:00:00.000Z`); cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  const start = cutoff.toISOString().slice(0, 10);
  const values = entries.filter((entry) => entry.localDate >= start && entry.localDate <= endDate).map((entry) => entry.weightGrams);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}
