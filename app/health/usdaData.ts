export interface UsdaNutrientValue {
  amount?: number;
  name?: string;
  nutrient?: { name?: string; unitName?: string };
  nutrientName?: string;
  unitName?: string;
  value?: number;
}

export interface UsdaFoodSummary {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  gtinUpc?: string;
  publicationDate?: string;
  score?: number;
  foodPortions?: Array<{ amount?: number; gramWeight?: number; modifier?: string; portionDescription?: string; measureUnit?: { name?: string; abbreviation?: string } }>;
  foodNutrients?: UsdaNutrientValue[];
}

export interface UsdaServing { label: string; grams: number; basis: "PER_SERVING" | "PER_100_GRAMS" }

const isGramUnit = (unit: string | undefined): boolean => ["g", "grm", "gram", "grams"].includes(unit?.trim().toLocaleLowerCase() ?? "");

export function usdaServingOptions(food: UsdaFoodSummary): UsdaServing[] {
  const options: UsdaServing[] = [];
  if (food.servingSize && food.servingSize > 0 && isGramUnit(food.servingSizeUnit)) options.push({ label: food.householdServingFullText?.trim() || `${food.servingSize} g`, grams: food.servingSize, basis: "PER_SERVING" });
  for (const portion of food.foodPortions ?? []) if (portion.gramWeight && portion.gramWeight > 0) {
    const unit = portion.modifier?.trim() || portion.portionDescription?.trim() || portion.measureUnit?.name?.trim() || portion.measureUnit?.abbreviation?.trim() || "serving";
    options.push({ label: `${portion.amount ?? 1} ${unit}`.trim(), grams: portion.gramWeight, basis: "PER_SERVING" });
  }
  options.push({ label: "100 g", grams: 100, basis: "PER_100_GRAMS" });
  return [...new Map(options.map((option) => [`${option.label.toLocaleLowerCase()}|${option.grams}`, option])).values()];
}

export function usdaServing(food: UsdaFoodSummary): UsdaServing { return usdaServingOptions(food)[0]!; }

export interface UsdaSearchResult {
  fdcId: number;
  name: string;
  brand: string | null;
  dataType: string;
  sourceLabel: string;
  servingLabel: string | null;
  nutritionBasis: "PER_SERVING" | "PER_100_GRAMS";
  calories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  gtinUpc: string | null;
  publicationDate: string | null;
  relevanceScore: number;
  duplicateCount: number;
}

export interface UsdaSearchOptions {
  completeOnly?: boolean;
  includeDuplicates?: boolean;
  limit?: number;
}

export function usdaNutrient(food: Pick<UsdaFoodSummary, "foodNutrients">, names: string[], unit?: string): number | null {
  const match = food.foodNutrients?.find((item) => {
    const nutrientName = (item.nutrient?.name ?? item.nutrientName ?? item.name ?? "").toLowerCase();
    const nutrientUnit = (item.nutrient?.unitName ?? item.unitName ?? "").toLowerCase();
    return names.includes(nutrientName) && (!unit || nutrientUnit === unit.toLowerCase());
  });
  const value = match?.amount ?? match?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function usdaSourceLabel(dataType: string): string {
  if (dataType === "Branded") return "Brand label";
  if (dataType === "Foundation") return "USDA analyzed";
  if (dataType === "Survey (FNDDS)") return "USDA survey";
  if (dataType === "SR Legacy") return "USDA legacy";
  return "USDA data";
}

export function normalizeUsdaSearchFood(food: UsdaFoodSummary): UsdaSearchResult {
  const serving = usdaServing(food);
  const servingGrams = serving.basis === "PER_SERVING" ? serving.grams : null;
  const factor = serving.grams / 100;
  const scaled = (value: number | null): number | null => (value === null ? null : value * factor);
  const dataType = food.dataType ?? "USDA";
  return {
    fdcId: food.fdcId,
    name: food.description ?? "Unnamed food",
    brand: food.brandOwner ?? food.brandName ?? null,
    dataType,
    sourceLabel: usdaSourceLabel(dataType),
    servingLabel: serving.basis === "PER_SERVING" ? serving.label : null,
    nutritionBasis: serving.basis,
    calories: scaled(usdaNutrient(food, ["energy"], "kcal")),
    proteinGrams: scaled(usdaNutrient(food, ["protein"])),
    carbsGrams: scaled(usdaNutrient(food, ["carbohydrate, by difference"])),
    fatGrams: scaled(usdaNutrient(food, ["total lipid (fat)"])),
    gtinUpc: food.gtinUpc?.trim() || null,
    publicationDate: food.publicationDate ?? null,
    relevanceScore: 0,
    duplicateCount: 1,
  };
}

const normalizeSearchText = (value: string): string => value.normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const macroSignature = (food: UsdaSearchResult): string => [food.calories, food.proteinGrams, food.carbsGrams, food.fatGrams].map((value) => value === null ? "?" : Math.round(value * 10) / 10).join("|");
const completeness = (food: UsdaSearchResult): number => [food.calories, food.proteinGrams, food.carbsGrams, food.fatGrams].filter((value) => value !== null).length;

function identity(food: UsdaSearchResult): string {
  const gtin = food.gtinUpc?.replace(/\D/g, "");
  if (gtin) return `gtin:${gtin}`;
  return `food:${normalizeSearchText(food.name)}|${normalizeSearchText(food.brand ?? "")}|${normalizeSearchText(food.servingLabel ?? "100 g")}|${macroSignature(food)}`;
}

function searchScore(food: UsdaSearchResult, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  const name = normalizeSearchText(food.name);
  const brand = normalizeSearchText(food.brand ?? "");
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const matchedTokens = tokens.filter((token) => name.includes(token) || brand.includes(token)).length;
  return (name === normalizedQuery ? 1000 : name.startsWith(normalizedQuery) ? 500 : name.includes(normalizedQuery) ? 250 : 0)
    + (tokens.length ? (matchedTokens / tokens.length) * 200 : 0)
    + completeness(food) * 12
    + (food.servingLabel ? 8 : 0);
}

export function rankUsdaSearchResults(foods: UsdaFoodSummary[], query: string, options: UsdaSearchOptions = {}): UsdaSearchResult[] {
  const normalized = foods.map(normalizeUsdaSearchFood)
    .filter((food) => !options.completeOnly || completeness(food) === 4)
    .map((food) => ({ ...food, relevanceScore: searchScore(food, query) }));
  const compare = (left: UsdaSearchResult, right: UsdaSearchResult): number => right.relevanceScore - left.relevanceScore
    || completeness(right) - completeness(left)
    || (right.publicationDate ?? "").localeCompare(left.publicationDate ?? "")
    || left.name.localeCompare(right.name)
    || left.fdcId - right.fdcId;
  const sorted = normalized.toSorted(compare);
  if (options.includeDuplicates) return sorted.slice(0, options.limit ?? 12);

  const grouped = new Map<string, UsdaSearchResult>();
  for (const food of sorted) {
    const key = identity(food);
    const existing = grouped.get(key);
    if (existing) existing.duplicateCount += 1;
    else grouped.set(key, { ...food });
  }
  return [...grouped.values()].toSorted(compare).slice(0, options.limit ?? 12);
}
