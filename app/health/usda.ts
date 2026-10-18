import "server-only";
import { env } from "@/env.mjs";
import type { Nutrients } from "./nutrition";

const endpoint = "https://api.nal.usda.gov/fdc/v1";

export interface UsdaSearchResult { fdcId: number; name: string; brand: string | null; dataType: string; }

interface UsdaNutrient { amount?: number; nutrient?: { name?: string; unitName?: string }; nutrientName?: string; unitName?: string; value?: number; }
interface UsdaFood { fdcId: number; description?: string; brandOwner?: string; brandName?: string; dataType?: string; servingSize?: number; servingSizeUnit?: string; foodNutrients?: UsdaNutrient[]; }

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const url = new URL(`${endpoint}${path}`); url.searchParams.set("api_key", env.USDA_API_KEY);
  let response: Response;
  try { response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(8_000) }); }
  catch { throw new Error("USDA food data is unavailable"); }
  if (!response.ok) throw new Error(response.status === 429 ? "USDA search is temporarily rate limited" : "USDA food data is unavailable");
  return response.json();
}

export async function searchUsda(query: string): Promise<UsdaSearchResult[]> {
  const data = await request("/foods/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, pageSize: 12 }) }) as { foods?: UsdaFood[] };
  return (data.foods ?? []).map((food) => ({ fdcId: food.fdcId, name: food.description ?? "Unnamed food", brand: food.brandOwner ?? food.brandName ?? null, dataType: food.dataType ?? "USDA" }));
}

function nutrient(food: UsdaFood, names: string[], unit?: string): number | null {
  const match = food.foodNutrients?.find((item) => names.includes((item.nutrient?.name ?? item.nutrientName ?? "").toLowerCase()) && (!unit || (item.nutrient?.unitName ?? item.unitName ?? "").toLowerCase() === unit));
  const value = match?.amount ?? match?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nutrientSum(food: UsdaFood, names: string[]): number | null {
  const values = names.map((name) => nutrient(food, [name])).filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

export async function fetchUsdaFood(fdcId: number): Promise<{ externalId: string; name: string; brand: string | null; servingLabel: string; servingGramsMilli: number; nutrients: Nutrients }> {
  const food = await request(`/food/${fdcId}`) as UsdaFood;
  const servingGrams = food.servingSizeUnit?.toLowerCase() === "g" && food.servingSize && food.servingSize > 0 ? food.servingSize : 100;
  const factor = servingGrams / 100;
  const scaled = (value: number | null, multiplier: number): number | null => value === null ? null : Math.round(value * factor * multiplier);
  return {
    externalId: String(food.fdcId), name: food.description ?? "Unnamed USDA food", brand: food.brandOwner ?? food.brandName ?? null,
    servingLabel: servingGrams === 100 ? "100 g" : `${servingGrams} g`, servingGramsMilli: Math.round(servingGrams * 1000),
    nutrients: {
      caloriesMilli: scaled(nutrient(food, ["energy"], "kcal"), 1000),
      proteinMg: scaled(nutrient(food, ["protein"]), 1000),
      carbsMg: scaled(nutrient(food, ["carbohydrate, by difference"]), 1000),
      fatMg: scaled(nutrient(food, ["total lipid (fat)"]), 1000),
      fiberMg: scaled(nutrient(food, ["fiber, total dietary"]), 1000),
      waterMg: scaled(nutrient(food, ["water"]), 1000),
      calciumMcg: scaled(nutrient(food, ["calcium, ca"]), 1000),
      potassiumMcg: scaled(nutrient(food, ["potassium, k"]), 1000),
      magnesiumMcg: scaled(nutrient(food, ["magnesium, mg"]), 1000),
      ironMcg: scaled(nutrient(food, ["iron, fe"]), 1000),
      vitaminDMcg: scaled(nutrient(food, ["vitamin d (d2 + d3)", "vitamin d3 (cholecalciferol)"]), 1),
      vitaminB12Mcg: scaled(nutrient(food, ["vitamin b-12"]), 1),
      omega3Mcg: scaled(nutrientSum(food, ["18:3 n-3 c,c,c (ala)", "20:5 n-3 (epa)", "22:5 n-3 (dpa)", "22:6 n-3 (dha)"]), 1_000_000),
    },
  };
}
