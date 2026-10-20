import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUsdaSearchFood, rankUsdaSearchResults, usdaServing, usdaServingOptions, usdaSourceLabel } from "./usdaData.ts";

test("USDA search nutrition scales from 100 grams to a supplied gram serving", () => {
  const result = normalizeUsdaSearchFood({
    fdcId: 1,
    description: "Greek yogurt",
    brandOwner: "Example Dairy",
    dataType: "Branded",
    servingSize: 150,
    servingSizeUnit: "g",
    householdServingFullText: "1 container (150 g)",
    foodNutrients: [
      { nutrientName: "Energy", unitName: "KCAL", value: 100 },
      { nutrientName: "Protein", unitName: "G", value: 10 },
      { nutrientName: "Carbohydrate, by difference", unitName: "G", value: 8 },
      { nutrientName: "Total lipid (fat)", unitName: "G", value: 2 },
    ],
  });

  assert.equal(result.nutritionBasis, "PER_SERVING");
  assert.equal(result.servingLabel, "1 container (150 g)");
  assert.equal(result.calories, 150);
  assert.equal(result.proteinGrams, 15);
  assert.equal(result.carbsGrams, 12);
  assert.equal(result.fatGrams, 3);
});

test("USDA search nutrition uses an explicit 100 gram fallback and preserves missing values", () => {
  const result = normalizeUsdaSearchFood({
    fdcId: 2,
    description: "Apple",
    dataType: "Foundation",
    foodNutrients: [
      { name: "Energy", unitName: "kJ", amount: 218 },
      { name: "Energy", unitName: "kcal", amount: 52 },
      { name: "Carbohydrate, by difference", unitName: "g", amount: 14 },
    ],
  });

  assert.equal(result.nutritionBasis, "PER_100_GRAMS");
  assert.equal(result.servingLabel, null);
  assert.equal(result.calories, 52);
  assert.equal(result.proteinGrams, null);
  assert.equal(result.carbsGrams, 14);
  assert.equal(result.sourceLabel, "USDA analyzed");
});

test("USDA data types have plain-language source labels", () => {
  assert.equal(usdaSourceLabel("Branded"), "Brand label");
  assert.equal(usdaSourceLabel("Survey (FNDDS)"), "USDA survey");
  assert.equal(usdaSourceLabel("SR Legacy"), "USDA legacy");
  assert.equal(usdaSourceLabel("Experimental"), "USDA data");
});

test("USDA serving selection recognizes branded GRM units and household portions", () => {
  assert.deepEqual(usdaServing({ fdcId: 3, servingSize: 43, servingSizeUnit: "GRM", householdServingFullText: "1 packet (43 g)" }), { label: "1 packet (43 g)", grams: 43, basis: "PER_SERVING" });
  assert.deepEqual(usdaServing({ fdcId: 4, foodPortions: [{ amount: 1, gramWeight: 28, modifier: "slice" }] }), { label: "1 slice", grams: 28, basis: "PER_SERVING" });
  assert.deepEqual(usdaServing({ fdcId: 5 }), { label: "100 g", grams: 100, basis: "PER_100_GRAMS" });
});

test("USDA serving options put the household portion before the 100 gram fallback", () => {
  assert.deepEqual(usdaServingOptions({ fdcId: 2620192, servingSize: 43, servingSizeUnit: "GRM", householdServingFullText: "1 packet" }), [
    { label: "1 packet", grams: 43, basis: "PER_SERVING" },
    { label: "100 g", grams: 100, basis: "PER_100_GRAMS" },
  ]);
});

const completeNutrients = [
  { nutrientName: "Energy", unitName: "KCAL", value: 100 },
  { nutrientName: "Protein", unitName: "G", value: 10 },
  { nutrientName: "Carbohydrate, by difference", unitName: "G", value: 8 },
  { nutrientName: "Total lipid (fat)", unitName: "G", value: 2 },
];

test("USDA ranking favors an exact, nutritionally complete match", () => {
  const results = rankUsdaSearchResults([
    { fdcId: 10, description: "Yogurt snack", foodNutrients: completeNutrients },
    { fdcId: 11, description: "Greek yogurt", foodNutrients: completeNutrients },
    { fdcId: 12, description: "Greek yogurt vanilla", foodNutrients: completeNutrients.slice(0, 1) },
  ], "Greek yogurt");
  assert.equal(results[0]?.fdcId, 11);
});

test("USDA deduplication groups exact GTIN matches but can reveal every entry", () => {
  const foods = [
    { fdcId: 20, description: "Cereal", gtinUpc: "001234", publicationDate: "2024-01-01", foodNutrients: completeNutrients.slice(0, 2) },
    { fdcId: 21, description: "Cereal", gtinUpc: "001234", publicationDate: "2025-01-01", foodNutrients: completeNutrients },
  ];
  const grouped = rankUsdaSearchResults(foods, "cereal");
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0]?.fdcId, 21);
  assert.equal(grouped[0]?.duplicateCount, 2);
  assert.equal(rankUsdaSearchResults(foods, "cereal", { includeDuplicates: true }).length, 2);
});

test("USDA complete-only filtering preserves unknown nutrients instead of treating them as zero", () => {
  const results = rankUsdaSearchResults([
    { fdcId: 30, description: "Complete", foodNutrients: completeNutrients },
    { fdcId: 31, description: "Incomplete", foodNutrients: completeNutrients.slice(0, 3) },
  ], "food", { completeOnly: true });
  assert.deepEqual(results.map((food) => food.fdcId), [30]);
});
