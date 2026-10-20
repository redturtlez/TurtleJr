import "server-only";
import { env } from "@/env.mjs";
import type { Nutrients } from "./nutrition";
import { barcodeLookupQueries, normalizeBarcode, type BarcodeFoodDraft } from "./barcodeData";
import { rankUsdaSearchResults, usdaNutrient, usdaServing, usdaServingOptions, type UsdaFoodSummary, type UsdaNutrientValue, type UsdaSearchResult, type UsdaServing } from "./usdaData";

export type { UsdaSearchResult } from "./usdaData";

const endpoint = "https://api.nal.usda.gov/fdc/v1";

interface UsdaFood extends UsdaFoodSummary { foodNutrients?: UsdaNutrientValue[]; }

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const url = new URL(`${endpoint}${path}`); url.searchParams.set("api_key", env.USDA_API_KEY);
  let response: Response;
  try { response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(8_000) }); }
  catch { throw new Error("USDA food data is unavailable"); }
  if (!response.ok) throw new Error(response.status === 429 ? "USDA search is temporarily rate limited" : "USDA food data is unavailable");
  return response.json();
}

export async function searchUsda(query: string, options: { scope: "ALL" | "GENERIC" | "BRANDED"; completeOnly: boolean; includeDuplicates: boolean }): Promise<UsdaSearchResult[]> {
  const dataType = options.scope === "BRANDED" ? ["Branded"] : options.scope === "GENERIC" ? ["Foundation", "Survey (FNDDS)", "SR Legacy"] : undefined;
  const data = await request("/foods/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, pageSize: 30, ...(dataType ? { dataType } : {}) }) }) as { foods?: UsdaFood[] };
  return rankUsdaSearchResults(data.foods ?? [], query, { completeOnly: options.completeOnly, includeDuplicates: options.includeDuplicates, limit: 12 });
}

function nutrientSum(food: UsdaFood, names: string[]): number | null {
  const values = names.map((name) => usdaNutrient(food, [name])).filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

export async function fetchUsdaFood(fdcId: number): Promise<{ externalId: string; name: string; brand: string | null; servingLabel: string; servingGramsMilli: number; nutritionBasis: "PER_SERVING" | "PER_100_GRAMS"; servingOptions: UsdaServing[]; nutrients: Nutrients }> {
  const food = await request(`/food/${fdcId}`) as UsdaFood;
  const serving = usdaServing(food); const servingGrams = serving.grams;
  const factor = servingGrams / 100;
  const scaled = (value: number | null, multiplier: number): number | null => value === null ? null : Math.round(value * factor * multiplier);
  return {
    externalId: String(food.fdcId), name: food.description ?? "Unnamed USDA food", brand: food.brandOwner ?? food.brandName ?? null,
    servingLabel: serving.label, servingGramsMilli: Math.round(servingGrams * 1000), nutritionBasis: serving.basis, servingOptions: usdaServingOptions(food),
    nutrients: {
      caloriesMilli: scaled(usdaNutrient(food, ["energy"], "kcal"), 1000),
      proteinMg: scaled(usdaNutrient(food, ["protein"]), 1000),
      carbsMg: scaled(usdaNutrient(food, ["carbohydrate, by difference"]), 1000),
      fatMg: scaled(usdaNutrient(food, ["total lipid (fat)"]), 1000),
      fiberMg: scaled(usdaNutrient(food, ["fiber, total dietary"]), 1000),
      waterMg: scaled(usdaNutrient(food, ["water"]), 1000),
      calciumMcg: scaled(usdaNutrient(food, ["calcium, ca"]), 1000),
      potassiumMcg: scaled(usdaNutrient(food, ["potassium, k"]), 1000),
      magnesiumMcg: scaled(usdaNutrient(food, ["magnesium, mg"]), 1000),
      ironMcg: scaled(usdaNutrient(food, ["iron, fe"]), 1000),
      vitaminDMcg: scaled(usdaNutrient(food, ["vitamin d (d2 + d3)", "vitamin d3 (cholecalciferol)"]), 1),
      vitaminB12Mcg: scaled(usdaNutrient(food, ["vitamin b-12"]), 1),
      omega3Mcg: scaled(nutrientSum(food, ["18:3 n-3 c,c,c (ala)", "20:5 n-3 (epa)", "22:5 n-3 (dpa)", "22:6 n-3 (dha)"]), 1_000_000),
    },
  };
}

export async function lookupUsdaBarcode(input: string): Promise<BarcodeFoodDraft | null> {
  const rawBarcode = input.replace(/\D/g, ""); const barcode = normalizeBarcode(rawBarcode); if (!barcode) return null;
  const queries = barcodeLookupQueries(input);
  const matches: UsdaFood[] = [];
  for (const query of queries) {
    const data = await request("/foods/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, dataType: ["Branded"], pageSize: 25 }) }) as { foods?: UsdaFood[] };
    matches.push(...(data.foods ?? []).filter((food) => normalizeBarcode(food.gtinUpc ?? "") === barcode));
    if (matches.length) break;
  }
  const summary = matches.toSorted((left, right) => (right.publicationDate ?? "").localeCompare(left.publicationDate ?? ""))[0];
  if (!summary) return null;
  const food = await fetchUsdaFood(summary.fdcId);
  const value = (stored: number | null | undefined, divisor: number): number | null => stored == null ? null : stored / divisor;
  const draft: BarcodeFoodDraft = {
    barcode, source: "USDA", externalId: food.externalId, sourceLabel: "USDA FoodData Central",
    name: food.name, brand: food.brand, servingLabel: food.servingLabel, servingGrams: food.servingGramsMilli / 1000,
    nutritionBasis: food.nutritionBasis, servingOptions: food.servingOptions, calories: value(food.nutrients.caloriesMilli, 1000), protein: value(food.nutrients.proteinMg, 1000), carbs: value(food.nutrients.carbsMg, 1000), fat: value(food.nutrients.fatMg, 1000), fiber: value(food.nutrients.fiberMg, 1000), water: value(food.nutrients.waterMg, 1000), calcium: value(food.nutrients.calciumMcg, 1000), potassium: value(food.nutrients.potassiumMcg, 1000), magnesium: value(food.nutrients.magnesiumMcg, 1000), iron: value(food.nutrients.ironMcg, 1000), vitaminD: food.nutrients.vitaminDMcg ?? null, vitaminB12: food.nutrients.vitaminB12Mcg ?? null, omega3: value(food.nutrients.omega3Mcg, 1000), warnings: [],
  };
  if ([draft.calories, draft.protein, draft.carbs, draft.fat].some((item) => item === null)) draft.warnings.push("Some calories or macros are unavailable and will remain unknown.");
  if (draft.nutritionBasis === "PER_100_GRAMS") draft.warnings.push("USDA did not provide a supported household serving; values are shown per 100 g.");
  return draft;
}
