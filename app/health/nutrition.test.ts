import assert from "node:assert/strict";
import test from "node:test";
import { aggregateGroceryItems, aggregateNutrients, buildNutritionInsightReview, estimateMaintenance, foodDensity, groupFoodLogs, kilogramsToGrams, mifflinStJeorRmr, poundsToGrams, proposeCalorieTarget, proposeProteinTarget, recipeNutrients, recipeServingGrams, recommendFoodSubstitutions, recommendRecipes, rollingWeightAverage, scaleNutrient } from "./nutrition.ts";

test("serving quantities scale integer nutrients deterministically", () => {
  assert.equal(scaleNutrient(250_000, 1500), 375_000);
  assert.equal(scaleNutrient(12_345, 333), 4_111);
});

test("food logs group newest dates first and meals in daily order", () => {
  const groups = groupFoodLogs([
    { id: "dinner", localDate: "2026-10-18", mealSlot: "DINNER" as const },
    { id: "snack", localDate: "2026-10-19", mealSlot: "SNACK" as const },
    { id: "breakfast", localDate: "2026-10-19", mealSlot: "BREAKFAST" as const },
  ]);
  assert.deepEqual(groups.map((group) => group.localDate), ["2026-10-19", "2026-10-18"]);
  assert.deepEqual(groups[0]?.meals.map((meal) => meal.mealSlot), ["BREAKFAST", "SNACK"]);
  assert.equal(groups[0]?.meals[0]?.logs[0]?.id, "breakfast");
});

test("missing nutrients remain missing instead of becoming zero", () => {
  const result = aggregateNutrients([{ quantityMilli: 1000, caloriesMilli: 100_000, proteinMg: null, carbsMg: 10_000, fatMg: null, fiberMg: null }]);
  assert.equal(result.proteinMg, null);
  assert.equal(result.caloriesMilli, 100_000);
});

test("reusable meal aggregation scales every item", () => {
  const result = aggregateNutrients([
    { quantityMilli: 2000, caloriesMilli: 100_000, proteinMg: 5_000, carbsMg: 10_000, fatMg: 2_000, fiberMg: 1_000 },
    { quantityMilli: 500, caloriesMilli: 80_000, proteinMg: 2_000, carbsMg: 5_000, fatMg: 3_000, fiberMg: null },
  ]);
  assert.equal(result.caloriesMilli, 240_000); assert.equal(result.proteinMg, 11_000); assert.equal(result.carbsMg, 22_500); assert.equal(result.fatMg, 5_500); assert.equal(result.fiberMg, 2_000);
});

test("weight conversion and seven-day averages use stored grams", () => {
  assert.equal(poundsToGrams(100), 45_359);
  assert.equal(kilogramsToGrams(72.5), 72_500);
  assert.equal(rollingWeightAverage([{ localDate: "2026-10-10", weightGrams: 70_000 }, { localDate: "2026-10-17", weightGrams: 72_000 }], "2026-10-17"), 72_000);
});

test("recipe nutrition derives from ingredients and servings", () => {
  const result = recipeNutrients({ servings: 2, ingredients: [{ name: "Beans", quantityMilli: 2000, caloriesMilli: 100_000, proteinMg: 8_000, carbsMg: 20_000, fatMg: 1_000, fiberMg: 6_000, calciumMcg: 40_000 }] });
  assert.equal(result.caloriesMilli, 100_000); assert.equal(result.proteinMg, 8_000); assert.equal(result.calciumMcg, 40_000);
});

test("recipe serving weight scales quantities and stays missing when an ingredient weight is unknown", () => {
  assert.equal(recipeServingGrams({ servings: 2, ingredients: [{ name: "Potato", quantityMilli: 2000, servingGramsMilli: 150_000, caloriesMilli: 100_000, proteinMg: 2_000, carbsMg: 20_000, fatMg: 0, fiberMg: 2_000 }] }), 150);
  assert.equal(recipeServingGrams({ servings: 1, ingredients: [{ name: "Unknown", quantityMilli: 1000, servingGramsMilli: null, caloriesMilli: 100_000, proteinMg: null, carbsMg: null, fatMg: null, fiberMg: null }] }), null);
});

test("recommendations respect avoidances and explain nutrient contributions", () => {
  const base = { servings: 1, prepMinutes: 20, complexity: "SIMPLE" as const, tags: [] as string[], caloriesMilli: null, proteinMg: null, carbsMg: null, fatMg: null, fiberMg: null };
  const recipes = [{ ...base, id: "beans", name: "Beans", ingredients: [{ name: "Beans", quantityMilli: 1000, caloriesMilli: 200_000, proteinMg: 20_000, carbsMg: 30_000, fatMg: 2_000, fiberMg: 8_000 }] }, { ...base, id: "fish", name: "Fish", tags: ["fish"], ingredients: [{ name: "Fish", quantityMilli: 1000, caloriesMilli: 200_000, proteinMg: 30_000, carbsMg: 0, fatMg: 5_000, fiberMg: 0 }] }];
  const result = recommendRecipes(recipes, { proteinMg: 100_000 }, { caloriesMilli: 0, proteinMg: 0, carbsMg: 0, fatMg: 0, fiberMg: 0 }, { avoidSeafood: true, avoidMushrooms: true, maxPrepMinutes: 45, preferredComplexity: "SIMPLE" });
  assert.deepEqual(result.map((item) => item.id), ["beans"]); assert.match(result[0]?.reasons.join(" ") ?? "", /protein/);
});

test("grocery aggregation scales repeated planned recipes", () => {
  const result = aggregateGroceryItems([{ servingsMilli: 2000, ingredients: [{ foodId: "a", name: "Rice", servingLabel: "1 cup", quantityMilli: 1000 }] }, { servingsMilli: 500, ingredients: [{ foodId: "a", name: "Rice", servingLabel: "1 cup", quantityMilli: 1000 }] }]);
  assert.equal(result[0]?.quantityMilli, 2500);
});

test("Mifflin-St Jeor and activity estimates are deterministic", () => {
  const input = { weightGrams: poundsToGrams(230), heightMillimeters: 1778, ageYears: 30, sex: "MALE" as const };
  assert.equal(mifflinStJeorRmr(input), 2010);
  assert.deepEqual(estimateMaintenance({ ...input, activityLevel: "SEDENTARY" }), { rmrCalories: 2010, maintenanceCalories: 2412, lowCalories: 2171, highCalories: 2653 });
});

test("calorie proposals enforce rate and calorie safeguards", () => {
  const moderate = proposeCalorieTarget({ maintenanceCalories: 2411, currentWeightGrams: poundsToGrams(230), requestedWeeklyLossGrams: 680, sex: "MALE" });
  assert.equal(moderate.targetCalories, 1663);
  assert.equal(moderate.limited, false);
  const aggressive = proposeCalorieTarget({ maintenanceCalories: 2411, currentWeightGrams: poundsToGrams(230), requestedWeeklyLossGrams: 2000, sex: "MALE" });
  assert.equal(aggressive.targetCalories, 1500);
  assert.equal(aggressive.maximumWeeklyLossGrams, 907);
  assert.equal(aggressive.limited, true);
});

test("protein proposals use goal weight and training status", () => {
  assert.deepEqual(proposeProteinTarget({ goalWeightGrams: poundsToGrams(180), resistanceTraining: true }), { targetGrams: 130, gramsPerKilogram: 1.6 });
  assert.deepEqual(proposeProteinTarget({ goalWeightGrams: poundsToGrams(180), resistanceTraining: false }), { targetGrams: 105, gramsPerKilogram: 1.3 });
});

test("food density reports only supported metrics", () => {
  const complete = foodDensity({ servingGramsMilli: 200_000, caloriesMilli: 100_000, proteinMg: 10_000, fiberMg: 5_000, waterMg: 160_000 });
  assert.equal(complete.caloriesPer100Grams, 50);
  assert.equal(complete.proteinGramsPer100Calories, 10);
  assert.equal(complete.fiberGramsPer100Calories, 5);
  assert.equal(complete.waterPercent, 80);
  assert.deepEqual(foodDensity({ servingGramsMilli: null, caloriesMilli: 100_000, proteinMg: null, fiberMg: null, waterMg: null }), { caloriesPer100Grams: null, proteinGramsPer100Calories: null, fiberGramsPer100Calories: null, waterPercent: null });
});

test("substitutions compare equal calories, respect avoidances, and explain improvements", () => {
  const base = { id: "candy", name: "Candy", servingGramsMilli: 50_000, caloriesMilli: 200_000, proteinMg: 1_000, carbsMg: 45_000, fatMg: 5_000, fiberMg: 0, waterMg: 2_000 };
  const yogurt = { id: "yogurt", name: "Greek yogurt and berries", servingGramsMilli: 200_000, caloriesMilli: 140_000, proteinMg: 18_000, carbsMg: 15_000, fatMg: 2_000, fiberMg: 4_000, waterMg: 150_000 };
  const peas = { ...yogurt, id: "peas", name: "Peas" };
  const result = recommendFoodSubstitutions(base, [base, peas, yogurt], { preferredFoods: ["Greek yogurt"], acceptableFoods: [], avoidedFoods: ["peas"] });
  assert.deepEqual(result.map((item) => item.id), ["yogurt"]);
  assert.match(result[0]?.reasons.join(" ") ?? "", /more food weight/);
  assert.match(result[0]?.reasons.join(" ") ?? "", /protein/);
});

test("personal ratings influence recipe order without overriding avoidances", () => {
  const base = { servings: 1, prepMinutes: 10, complexity: "SIMPLE" as const, tags: [] as string[], caloriesMilli: null, proteinMg: null, carbsMg: null, fatMg: null, fiberMg: null };
  const ingredient = { name: "Chicken", quantityMilli: 1000, caloriesMilli: 200_000, proteinMg: 30_000, carbsMg: 0, fatMg: 5_000, fiberMg: 0 };
  const result = recommendRecipes([{ ...base, id: "rated", name: "Chicken bowl", ingredients: [ingredient] }, { ...base, id: "plain", name: "Turkey bowl", ingredients: [{ ...ingredient, name: "Turkey" }] }, { ...base, id: "avoid", name: "Pea bowl", ingredients: [{ ...ingredient, name: "Peas" }] }], {}, { caloriesMilli: 0, proteinMg: 0, carbsMg: 0, fatMg: 0, fiberMg: 0 }, { avoidSeafood: true, avoidMushrooms: true, maxPrepMinutes: 30, preferredComplexity: "SIMPLE", avoidedFoods: ["peas"], ratings: { rated: { fullness: 5, enjoyment: 5, convenience: 5, eatAgain: true } } });
  assert.deepEqual(result.map((item) => item.id), ["rated", "plain"]);
  assert.match(result[0]?.reasons.join(" ") ?? "", /filling/);
});

test("nutrition insights require four logged days and return only the strongest two gaps", () => {
  const base = { quantityMilli: 1000, dataQuality: "KNOWN" as const, caloriesMilli: 1_800_000, proteinMg: 50_000, carbsMg: 100_000, fatMg: 40_000, fiberMg: 5_000, calciumMcg: 500_000 };
  const sparse = buildNutritionInsightReview(Array.from({ length: 3 }, (_, index) => ({ ...base, localDate: `2026-10-${index + 15}` })), { proteinMg: 100_000 }, "2026-10-17");
  assert.equal(sparse.status, "INSUFFICIENT_LOGS");
  const review = buildNutritionInsightReview(Array.from({ length: 4 }, (_, index) => ({ ...base, localDate: `2026-10-${index + 14}` })), { proteinMg: 100_000, fiberMg: 30_000, calciumMcg: 1_000_000 }, "2026-10-17");
  assert.equal(review.status, "READY");
  assert.deepEqual(review.insights.map((item) => item.label), ["Fiber", "Protein"]);
  assert.match(review.insights[0]?.evidence ?? "", /4 logged days/);
});

test("nutrition insights suppress conclusions from substantially missing values", () => {
  const logs = Array.from({ length: 4 }, (_, index) => ({ localDate: `2026-10-${index + 14}`, quantityMilli: 1000, dataQuality: "KNOWN" as const, caloriesMilli: 1_800_000, proteinMg: index === 0 ? null : 50_000, carbsMg: 100_000, fatMg: 40_000, fiberMg: 5_000 }));
  const review = buildNutritionInsightReview(logs, { proteinMg: 100_000 }, "2026-10-17");
  assert.equal(review.status, "LIMITED_DATA");
  assert.deepEqual(review.insights, []);
});
