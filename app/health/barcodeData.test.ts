import assert from "node:assert/strict";
import test from "node:test";
import { barcodeLookupQueries, hasValidGtinCheckDigit, normalizeBarcode, openFoodFactsDraft, selectBarcodeServing } from "./barcodeData.ts";

test("barcode normalization follows Open Food Facts leading-zero rules", () => {
  assert.equal(normalizeBarcode("034000470693"), "0034000470693");
  assert.equal(normalizeBarcode("1234567"), "01234567");
  assert.equal(normalizeBarcode("not a barcode"), null);
});

test("GTIN check digits reject likely camera misreads", () => {
  assert.equal(hasValidGtinCheckDigit("036000291452"), true);
  assert.equal(hasValidGtinCheckDigit("036000291453"), false);
  assert.equal(hasValidGtinCheckDigit("12345678"), true);
});

test("USDA lookup tries the scanned UPC before its normalized GTIN", () => {
  assert.deepEqual(barcodeLookupQueries("041190081035"), ["041190081035", "0041190081035"]);
  assert.deepEqual(barcodeLookupQueries("0041190081035"), ["0041190081035", "041190081035"]);
});

test("Open Food Facts serving nutrition is scaled without inventing missing values", () => {
  const result = openFoodFactsDraft({ code: "034000470693", product_name: "Test cereal", brands: "Example", serving_size: "30 g", serving_quantity: 30, serving_quantity_unit: "g", nutriments: { "energy-kcal_100g": 400, proteins_100g: 10, carbohydrates_100g: 70, calcium_100g: 0.1, calcium_unit: "g" } }, "034000470693");
  assert.equal(result?.barcode, "0034000470693");
  assert.equal(result?.calories, 120);
  assert.equal(result?.protein, 3);
  assert.equal(result?.calcium, 30);
  assert.equal(result?.fiber, null);
  assert.deepEqual(result?.servingOptions.map(({ label, grams }) => ({ label, grams })), [
    { label: "30 g", grams: 30 },
    { label: "100 g", grams: 100 },
  ]);
  assert.match(result?.warnings.join(" ") ?? "", /unavailable/);
});

test("selecting another portion rescales known nutrients and preserves unknown values", () => {
  const result = openFoodFactsDraft({ code: "034000470693", product_name: "Test cereal", serving_size: "30 g", serving_quantity: 30, serving_quantity_unit: "g", nutriments: { "energy-kcal_100g": 400, proteins_100g: 10 } }, "034000470693");
  assert.ok(result);
  const per100 = result.servingOptions.find((option) => option.basis === "PER_100_GRAMS");
  assert.ok(per100);
  const selected = selectBarcodeServing(result, per100);
  assert.equal(selected.servingLabel, "100 g");
  assert.equal(selected.calories, 400);
  assert.equal(selected.protein, 10);
  assert.equal(selected.fiber, null);
});

test("Open Food Facts falls back explicitly to a 100 gram basis", () => {
  const result = openFoodFactsDraft({ code: "12345678", product_name: "Unknown serving", nutriments: { "energy-kcal_100g": 80 } }, "12345678");
  assert.equal(result?.nutritionBasis, "PER_100_GRAMS");
  assert.equal(result?.servingLabel, "100 g");
  assert.equal(result?.protein, null);
});
