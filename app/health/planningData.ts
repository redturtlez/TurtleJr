import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/database";
import { shiftDateKey } from "./analytics";
import { aggregateGroceryItems, aggregateNutrients, recipeNutrients, recommendRecipes, type NutrientKey, type Nutrients, type RecipeNutritionInput } from "./nutrition";
import type { NutritionDashboardData } from "./nutritionData";

function mondayFor(localDate: string): string { const date = new Date(`${localDate}T00:00:00.000Z`); const offset = (date.getUTCDay() + 6) % 7; return shiftDateKey(localDate, -offset); }
const foodNutrients = (food: NutritionDashboardData["foods"][number]): Nutrients => ({ caloriesMilli: food.caloriesMilli, proteinMg: food.proteinMg, carbsMg: food.carbsMg, fatMg: food.fatMg, fiberMg: food.fiberMg, calciumMcg: food.calciumMcg, potassiumMcg: food.potassiumMcg, magnesiumMcg: food.magnesiumMcg, ironMcg: food.ironMcg, vitaminDMcg: food.vitaminDMcg, vitaminB12Mcg: food.vitaminB12Mcg, omega3Mcg: food.omega3Mcg, waterMg: food.waterMg });

export interface PlanningDashboardData {
  weekStart: string;
  recipes: Array<{ id: string; name: string; instructions: string; tags: string[]; servings: number; prepMinutes: number | null; complexity: "SIMPLE" | "MODERATE" | "INVOLVED"; nutrients: Nutrients; ingredients: Array<{ foodId: string; name: string; servingLabel: string; quantityMilli: number }> }>;
  suggestions: Array<{ recipeId: string; name: string; reasons: string[] }>;
  plan: Array<{ id: string; localDate: string; mealSlot: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"; recipeId: string; recipeName: string; servingsMilli: number }>;
  grocery: Array<{ foodId: string; name: string; servingLabel: string; quantityMilli: number; inPantry: boolean; purchased: boolean }>;
  completeness: Array<{ key: NutrientKey; label: string; value: number | null; target: number | null; percent: number | null; missingEntries: number; estimatedEntries: number }>;
}

export async function getPlanningDashboardData(localDate: string, nutrition: NutritionDashboardData): Promise<PlanningDashboardData> {
  const { userId } = await auth(); if (!userId) throw new Error("You must be signed in to plan meals");
  const weekStart = mondayFor(localDate); const weekEnd = shiftDateKey(weekStart, 6);
  const [recipesRaw, planRaw, groceryStates] = await Promise.all([
    prisma.lifeRecipe.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { ingredients: { orderBy: { position: "asc" }, include: { food: true } } } }),
    prisma.lifeMealPlanEntry.findMany({ where: { userId, localDate: { gte: weekStart, lte: weekEnd } }, orderBy: [{ localDate: "asc" }, { mealSlot: "asc" }], include: { recipe: { include: { ingredients: { include: { food: true } } } } } }),
    prisma.lifeGroceryState.findMany({ where: { userId, weekStart } }),
  ]);
  const inputs: RecipeNutritionInput[] = recipesRaw.map((recipe) => ({ id: recipe.id, name: recipe.name, servings: recipe.servings, prepMinutes: recipe.prepMinutes, complexity: recipe.complexity, tags: recipe.tags, caloriesMilli: null, proteinMg: null, carbsMg: null, fatMg: null, fiberMg: null, ingredients: recipe.ingredients.map((item) => ({ name: item.food.name, quantityMilli: item.quantityMilli, servingGramsMilli: item.food.servingGramsMilli, ...foodNutrients(item.food as NutritionDashboardData["foods"][number]) })) }));
  const recipes: PlanningDashboardData["recipes"] = recipesRaw.map((recipe, index) => ({ id: recipe.id, name: recipe.name, instructions: recipe.instructions, tags: recipe.tags, servings: recipe.servings, prepMinutes: recipe.prepMinutes, complexity: recipe.complexity, nutrients: recipeNutrients(inputs[index]!), ingredients: recipe.ingredients.map((item) => ({ foodId: item.foodId, name: item.food.name, servingLabel: item.food.servingLabel, quantityMilli: item.quantityMilli })) }));
  const settings = nutrition.settings; const targets: Partial<Record<NutrientKey, number | null>> = { caloriesMilli: settings.calorieTargetMilli, proteinMg: settings.proteinTargetMg, carbsMg: settings.carbsTargetMg, fatMg: settings.fatTargetMg, fiberMg: settings.fiberTargetMg, calciumMcg: settings.calciumTargetMcg, potassiumMcg: settings.potassiumTargetMcg, magnesiumMcg: settings.magnesiumTargetMcg, ironMcg: settings.ironTargetMcg, vitaminDMcg: settings.vitaminDTargetMcg, vitaminB12Mcg: settings.vitaminB12TargetMcg, omega3Mcg: settings.omega3TargetMcg };
  const recipeRatings = Object.fromEntries(nutrition.feedback.filter((item) => item.targetType === "RECIPE").map((item) => [item.targetId, item]));
  const ranked = recommendRecipes(inputs, targets, nutrition.summary, { ...settings, ratings: recipeRatings });
  const stateByFood = new Map(groceryStates.map((item) => [item.foodId, item]));
  const grocery = aggregateGroceryItems(planRaw.map((entry) => ({ servingsMilli: Math.round(entry.servingsMilli / entry.recipe.servings), ingredients: entry.recipe.ingredients.map((item) => ({ foodId: item.foodId, name: item.food.name, servingLabel: item.food.servingLabel, quantityMilli: item.quantityMilli })) }))).map((item) => ({ ...item, inPantry: stateByFood.get(item.foodId)?.inPantry ?? false, purchased: stateByFood.get(item.foodId)?.purchased ?? false }));
  const recentStart = shiftDateKey(localDate, -6); const recent = nutrition.logs.filter((log) => log.localDate >= recentStart && log.localDate <= localDate); const daysLogged = new Set(recent.map((log) => log.localDate)).size; const totals = aggregateNutrients(recent);
  const labels: Array<[NutrientKey, string]> = [["calciumMcg", "Calcium"], ["potassiumMcg", "Potassium"], ["magnesiumMcg", "Magnesium"], ["ironMcg", "Iron"], ["vitaminDMcg", "Vitamin D"], ["vitaminB12Mcg", "Vitamin B12"], ["omega3Mcg", "Omega-3"]];
  return { weekStart, recipes, suggestions: ranked.map((item) => ({ recipeId: item.id, name: recipes.find((recipe) => recipe.id === item.id)?.name ?? "Recipe", reasons: item.reasons })), plan: planRaw.map((entry) => ({ id: entry.id, localDate: entry.localDate, mealSlot: entry.mealSlot, recipeId: entry.recipeId, recipeName: entry.recipe.name, servingsMilli: entry.servingsMilli })), grocery, completeness: labels.map(([key, label]) => { const target = targets[key] ?? null; const value = totals[key] ?? null; const periodTarget = target && daysLogged ? target * daysLogged : null; return { key, label, value, target: periodTarget, percent: periodTarget && value !== null ? Math.round(value / periodTarget * 100) : null, missingEntries: recent.filter((item) => item[key] == null).length, estimatedEntries: recent.filter((item) => item.dataQuality === "ESTIMATED" && item[key] != null).length }; }) };
}
