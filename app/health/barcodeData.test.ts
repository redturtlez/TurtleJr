import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBarcode, openFoodFactsDraft } from "./barcodeData.ts";

test("barcode normalization follows Open Food Facts leading-zero rules", () => {
  assert.equal(normalizeBarcode("034000470693"), "0034000470693");
  assert.equal(normalizeBarcode("1234567"), "01234567");
  assert.equal(normalizeBarcode("not a barcode"), null);
});

test("Open Food Facts serving nutrition is scaled without inventing missing values", () => {
  const result = openFoodFactsDraft({ code: "034000470693", product_name: "Test cereal", brands: "Example", serving_size: "30 g", serving_quantity: 30, serving_quantity_unit: "g", nutriments: { "energy-kcal_100g": 400, proteins_100g: 10, carbohydrates_100g: 70, calcium_100g: 0.1, calcium_unit: "g" } }, "034000470693");
  assert.equal(result?.barcode, "0034000470693");
  assert.equal(result?.calories, 120);
  assert.equal(result?.protein, 3);
  assert.equal(result?.calcium, 30);
  assert.equal(result?.fiber, null);
  assert.match(result?.warnings.join(" ") ?? "", /unavailable/);
});

test("Open Food Facts falls back explicitly to a 100 gram basis", () => {
  const result = openFoodFactsDraft({ code: "12345678", product_name: "Unknown serving", nutriments: { "energy-kcal_100g": 80 } }, "12345678");
  assert.equal(result?.nutritionBasis, "PER_100_GRAMS");
  assert.equal(result?.servingLabel, "100 g");
  assert.equal(result?.protein, null);
});
