import "server-only";
import { normalizeBarcode, openFoodFactsDraft, type BarcodeFoodDraft, type OpenFoodFactsProduct } from "./barcodeData";
import { lookupUsdaBarcode } from "./usda";

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeFoodDraft | null> {
  const fields = ["code", "product_name", "product_name_en", "brands", "serving_size", "serving_quantity", "serving_quantity_unit", "nutrition_data_per", "nutriments"].join(",");
  const url = new URL(`https://world.openfoodfacts.org/api/v3/product/${barcode}`); url.searchParams.set("fields", fields); url.searchParams.set("product_type", "food");
  let response: Response;
  try { response = await fetch(url, { headers: { "User-Agent": "TurtleJr/0.1 (nutrition barcode lookup)" }, cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(8_000) }); }
  catch { throw new Error("Open Food Facts is unavailable"); }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(response.status === 429 ? "Open Food Facts is temporarily rate limited" : "Open Food Facts is unavailable");
  const data = await response.json() as { product?: OpenFoodFactsProduct };
  return data.product ? openFoodFactsDraft(data.product, barcode) : null;
}

export async function lookupBarcode(input: string): Promise<BarcodeFoodDraft> {
  const barcode = normalizeBarcode(input); if (!barcode) throw new Error("Enter a valid 6–14 digit barcode");
  let usdaUnavailable = false;
  try { const usda = await lookupUsdaBarcode(barcode); if (usda) return usda; }
  catch { usdaUnavailable = true; }
  const openFoodFacts = await lookupOpenFoodFacts(barcode);
  if (openFoodFacts) { if (usdaUnavailable) openFoodFacts.warnings.push("USDA was unavailable, so this result came from Open Food Facts."); return openFoodFacts; }
  throw new Error("No nutrition product was found for this barcode. You can add it manually instead.");
}
