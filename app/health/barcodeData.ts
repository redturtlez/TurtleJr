export type BarcodeFoodSource = "USDA" | "OPEN_FOOD_FACTS";

export interface BarcodeFoodDraft {
  barcode: string;
  source: BarcodeFoodSource;
  externalId: string;
  sourceLabel: string;
  name: string;
  brand: string | null;
  servingLabel: string;
  servingGrams: number | null;
  nutritionBasis: "PER_SERVING" | "PER_100_GRAMS";
  servingOptions: Array<{ label: string; grams: number; basis: "PER_SERVING" | "PER_100_GRAMS" }>;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  water: number | null;
  calcium: number | null;
  potassium: number | null;
  magnesium: number | null;
  iron: number | null;
  vitaminD: number | null;
  vitaminB12: number | null;
  omega3: number | null;
  warnings: string[];
}

const scalableNutrients = ["calories", "protein", "carbs", "fat", "fiber", "water", "calcium", "potassium", "magnesium", "iron", "vitaminD", "vitaminB12", "omega3"] as const;

export function selectBarcodeServing(draft: BarcodeFoodDraft, option: BarcodeFoodDraft["servingOptions"][number]): BarcodeFoodDraft {
  const ratio = draft.servingGrams && draft.servingGrams > 0 ? option.grams / draft.servingGrams : 1;
  return {
    ...draft, servingLabel: option.label, servingGrams: option.grams, nutritionBasis: option.basis,
    ...Object.fromEntries(scalableNutrients.map((key) => [key, draft[key] === null ? null : draft[key] * ratio])),
  };
}

export function normalizeBarcode(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 14) return null;
  const significant = digits.replace(/^0+/, "") || "0";
  if (significant.length <= 7) return significant.padStart(8, "0");
  if (significant.length >= 9 && significant.length <= 12) return significant.padStart(13, "0");
  return digits;
}

export function barcodeLookupQueries(input: string): string[] {
  const raw = input.replace(/\D/g, "");
  const canonical = normalizeBarcode(raw);
  if (!canonical) return [];
  const alternate = raw.length === 13 && raw.startsWith("0") ? raw.slice(1) : canonical;
  return [...new Set([raw, alternate])];
}

export function hasValidGtinCheckDigit(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  if (![12, 13, 14].includes(digits.length)) return true;
  const values = [...digits].map(Number); const check = values.pop(); if (check === undefined) return false;
  const sum = values.toReversed().reduce((total, value, index) => total + value * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  nutrition_data_per?: string;
  nutriments?: Record<string, unknown>;
}

const numberValue = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() && Number.isFinite(Number(value)) ? Number(value) : null;

function nutrient(product: OpenFoodFactsProduct, key: string, basis: "serving" | "100g", factor: number, target: "g" | "mg" | "mcg" = "g"): number | null {
  const nutriments = product.nutriments ?? {};
  const direct = numberValue(nutriments[`${key}_${basis}`]);
  const per100 = numberValue(nutriments[`${key}_100g`]);
  const value = direct ?? (basis === "serving" && per100 !== null ? per100 * factor : per100);
  if (value === null) return null;
  const unit = String(nutriments[`${key}_unit`] ?? (key === "energy-kcal" ? "kcal" : "g")).toLocaleLowerCase();
  if (key === "energy-kcal") return unit === "kj" ? value / 4.184 : value;
  const grams = unit === "mg" ? value / 1000 : unit === "µg" || unit === "ug" || unit === "mcg" ? value / 1_000_000 : unit === "kg" ? value * 1000 : value;
  return target === "g" ? grams : target === "mg" ? grams * 1000 : grams * 1_000_000;
}

export function openFoodFactsDraft(product: OpenFoodFactsProduct, requestedBarcode: string): BarcodeFoodDraft | null {
  const barcode = normalizeBarcode(product.code ?? requestedBarcode);
  const name = product.product_name_en?.trim() || product.product_name?.trim();
  if (!barcode || !name) return null;
  const servingGrams = numberValue(product.serving_quantity);
  const servingUnit = product.serving_quantity_unit?.toLocaleLowerCase();
  const hasGramServing = servingGrams !== null && servingGrams > 0 && (!servingUnit || servingUnit === "g" || servingUnit === "gram" || servingUnit === "grams");
  const basis = hasGramServing ? "serving" as const : "100g" as const;
  const factor = hasGramServing ? servingGrams / 100 : 1;
  const draft: BarcodeFoodDraft = {
    barcode, source: "OPEN_FOOD_FACTS", externalId: barcode, sourceLabel: "Open Food Facts",
    name, brand: product.brands?.trim() || null,
    servingLabel: hasGramServing ? product.serving_size?.trim() || `${servingGrams} g` : "100 g",
    servingGrams: hasGramServing ? servingGrams : 100,
    nutritionBasis: hasGramServing ? "PER_SERVING" : "PER_100_GRAMS",
    servingOptions: hasGramServing ? [{ label: product.serving_size?.trim() || `${servingGrams} g`, grams: servingGrams, basis: "PER_SERVING" }, { label: "100 g", grams: 100, basis: "PER_100_GRAMS" }] : [{ label: "100 g", grams: 100, basis: "PER_100_GRAMS" }],
    calories: nutrient(product, "energy-kcal", basis, factor),
    protein: nutrient(product, "proteins", basis, factor),
    carbs: nutrient(product, "carbohydrates", basis, factor),
    fat: nutrient(product, "fat", basis, factor),
    fiber: nutrient(product, "fiber", basis, factor),
    water: nutrient(product, "water", basis, factor),
    calcium: nutrient(product, "calcium", basis, factor, "mg"),
    potassium: nutrient(product, "potassium", basis, factor, "mg"),
    magnesium: nutrient(product, "magnesium", basis, factor, "mg"),
    iron: nutrient(product, "iron", basis, factor, "mg"),
    vitaminD: nutrient(product, "vitamin-d", basis, factor, "mcg"),
    vitaminB12: nutrient(product, "vitamin-b12", basis, factor, "mcg"),
    omega3: nutrient(product, "omega-3-fat", basis, factor, "mg"),
    warnings: [],
  };
  const knownMacros = [draft.calories, draft.protein, draft.carbs, draft.fat].filter((value) => value !== null).length;
  if (knownMacros < 4) draft.warnings.push("Some calories or macros are unavailable and will remain unknown.");
  if (!hasGramServing) draft.warnings.push("No supported gram serving was supplied; values are shown per 100 g.");
  return draft;
}
