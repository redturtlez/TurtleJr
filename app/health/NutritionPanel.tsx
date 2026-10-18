"use client";

import { Apple, Database, Plus, Scale, Search, Utensils } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { gramsToWeight, recommendFoodSubstitutions } from "./nutrition";
import {
  acceptNutritionProposal, createFood, createMeal, importUsdaFood, logFood, logMeal,
  saveNutritionFeedback, saveNutritionSettings, saveWeight, searchUsdaFoods, updateFoodLog,
} from "./nutritionActions";
import type { NutritionDashboardData } from "./nutritionData";
import styles from "./health.module.css";

type Slot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type SearchResult = Awaited<ReturnType<typeof searchUsdaFoods>>[number];
const numberOrNull = (value: FormDataEntryValue | null): number | null => String(value ?? "").trim() ? Number(value) : null;
const display = (value: number | null, kind: "cal" | "g" = "g"): string => value === null ? "—" : kind === "cal" ? `${Math.round(value / 1000)}` : `${(value / 1000).toFixed(1)}g`;
const terms = (value: FormDataEntryValue | null): string[] => String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
const initialPreferences = {
  preferred: ["chicken", "turkey", "beef", "eggs", "Greek yogurt", "cottage cheese", "cauliflower", "broccoli", "apples", "oranges", "bananas", "berries", "grapes", "melons", "oatmeal"],
  acceptable: ["baby carrots", "cucumbers", "tomatoes", "potatoes", "beans", "pasta", "rice", "milk", "cheese", "protein shakes", "rice cakes"],
  avoided: ["fish", "seafood", "mushrooms", "peas"],
};

export default function NutritionPanel({ data, localDate }: { data: NutritionDashboardData; localDate: string }) {
  const [pending, startTransition] = useTransition();
  const [slot, setSlot] = useState<Slot>("BREAKFAST");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mealFoods, setMealFoods] = useState<Record<string, number>>({});
  const [comparisonFoodId, setComparisonFoodId] = useState("");
  const run = (work: () => Promise<unknown>, success: string): void => startTransition(async () => {
    try { await work(); toast.success(success); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Nutrition update failed"); }
  });

  const latestWeight = data.weights[0]?.weightGrams ?? null;
  const unit = data.settings.weightUnit;
  const comparisonFood = data.foods.find((food) => food.id === comparisonFoodId);
  const substitutions = comparisonFood ? recommendFoodSubstitutions(comparisonFood, data.foods, data.settings) : [];
  const targetDefaults: Record<string, number | ""> = {
    targetWeight: data.settings.targetWeightGrams ? gramsToWeight(data.settings.targetWeightGrams, unit) : unit === "LB" ? 180 : 81.6,
    calorieTarget: data.settings.calorieTargetMilli === null ? "" : data.settings.calorieTargetMilli / 1000,
    proteinTarget: data.settings.proteinTargetMg === null ? "" : data.settings.proteinTargetMg / 1000,
    carbsTarget: data.settings.carbsTargetMg === null ? "" : data.settings.carbsTargetMg / 1000,
    fatTarget: data.settings.fatTargetMg === null ? "" : data.settings.fatTargetMg / 1000,
    fiberTarget: data.settings.fiberTargetMg === null ? "" : data.settings.fiberTargetMg / 1000,
    calciumTarget: data.settings.calciumTargetMcg === null ? "" : data.settings.calciumTargetMcg / 1000,
    potassiumTarget: data.settings.potassiumTargetMcg === null ? "" : data.settings.potassiumTargetMcg / 1000,
    magnesiumTarget: data.settings.magnesiumTargetMcg === null ? "" : data.settings.magnesiumTargetMcg / 1000,
    ironTarget: data.settings.ironTargetMcg === null ? "" : data.settings.ironTargetMcg / 1000,
    vitaminDTarget: data.settings.vitaminDTargetMcg ?? "", vitaminB12Target: data.settings.vitaminB12TargetMcg ?? "",
    omega3Target: data.settings.omega3TargetMcg === null ? "" : data.settings.omega3TargetMcg / 1000,
  };
  const targets = [
    { key: "caloriesMilli" as const, label: "Calories", value: data.summary.caloriesMilli, target: data.settings.calorieTargetMilli, kind: "cal" as const },
    { key: "proteinMg" as const, label: "Protein", value: data.summary.proteinMg, target: data.settings.proteinTargetMg, kind: "g" as const },
    { key: "carbsMg" as const, label: "Carbs", value: data.summary.carbsMg, target: data.settings.carbsTargetMg, kind: "g" as const },
    { key: "fatMg" as const, label: "Fat", value: data.summary.fatMg, target: data.settings.fatTargetMg, kind: "g" as const },
    { key: "fiberMg" as const, label: "Fiber", value: data.summary.fiberMg, target: data.settings.fiberTargetMg, kind: "g" as const },
  ];

  return <section className={styles.nutritionPage}>
    <div className={styles.sectionLead}><small>Personalized nutrition</small><h2>Today’s intake, without guesswork.</h2><p>Track confirmed values, keep regular meals one tap away, and compare foods using explainable volume, protein, and fiber features.</p></div>
    <div className={styles.nutritionSummary}>{targets.map((item) => <article key={item.label}><span>{item.label}</span><strong>{display(item.value, item.kind)}</strong><small>{data.missingCounts[item.key] ? `Partial · ${data.missingCounts[item.key]} missing` : item.target === null ? "No target set" : `of ${display(item.target, item.kind)}`}</small>{item.target ? <i><b style={{ width: `${Math.min(100, ((item.value ?? 0) / item.target) * 100)}%` }} /></i> : null}</article>)}</div>
    <div className={styles.nutritionGrid}>
      <div className={styles.nutritionMain}>
        <article className={styles.nutritionCard}>
          <div className={styles.panelHeading}><div><small>Quick log</small><h2>Saved foods</h2></div><Apple /></div>
          <div className={styles.slotPicker}>{(["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as Slot[]).map((value) => <button type="button" aria-pressed={slot === value} onClick={() => setSlot(value)} key={value}>{value.toLowerCase()}</button>)}</div>
          <div className={styles.foodList}>{data.foods.map((food) => <div key={food.id}><span><strong>{food.name}</strong><small>{food.servingLabel} · {display(food.caloriesMilli, "cal")} cal · {display(food.proteinMg)} protein</small></span><button disabled={pending} onClick={() => run(() => logFood({ foodId: food.id, localDate, mealSlot: slot, quantity: 1 }), `${food.name} logged`)}><Plus />1 serving</button></div>)}{!data.foods.length ? <p className={styles.emptyCopy}>Save a manual or USDA food to enable one-tap logging.</p> : null}</div>
        </article>

        <article className={styles.nutritionCard}>
          <div className={styles.panelHeading}><div><small>Pinned meals appear first</small><h2>Reusable meals</h2></div><Utensils /></div>
          <div className={styles.mealList}>{data.meals.map((meal) => <div key={meal.id} className={styles.mealEntry}><span><strong>{meal.pinned ? "★ " : ""}{meal.name}</strong><small>{meal.defaultMealSlot ? `${meal.defaultMealSlot.toLowerCase()} · ` : ""}{meal.items.map((item) => item.name).join(" · ")}</small></span><button disabled={pending} onClick={() => run(() => logMeal({ mealId: meal.id, localDate, mealSlot: meal.defaultMealSlot ?? slot, quantity: 1 }), `${meal.name} logged`)}>Log meal</button><details><summary>Quick rating</summary><form className={styles.compactForm} action={(form) => run(() => saveNutritionFeedback({ targetType: "MEAL", targetId: meal.id, fullness: numberOrNull(form.get("fullness")), enjoyment: numberOrNull(form.get("enjoyment")), convenience: numberOrNull(form.get("convenience")), eatAgain: form.get("eatAgain") === "yes" ? true : form.get("eatAgain") === "no" ? false : null }), "Rating saved")}><div className={styles.threeColumns}>{["fullness", "enjoyment", "convenience"].map((name) => <label key={name}><span>{name} (1–5)</span><input name={name} type="number" min="1" max="5" /></label>)}</div><label><span>Eat again?</span><select name="eatAgain" defaultValue=""><option value="">Not rated</option><option value="yes">Yes</option><option value="no">No</option></select></label><button disabled={pending}>Save rating</button></form></details></div>)}</div>
          <form className={styles.compactForm} action={(form) => run(() => createMeal({ name: String(form.get("name") ?? ""), pinned: form.get("pinned") === "on", defaultMealSlot: String(form.get("defaultMealSlot") ?? "") || null, items: Object.entries(mealFoods).filter(([, quantity]) => quantity > 0).map(([foodId, quantity]) => ({ foodId, quantity })) }), "Meal saved")}>
            <label><span>Meal name</span><input name="name" required /></label><label className={styles.checkRow}><input name="pinned" type="checkbox" /><span>Pin for frequent logging</span></label>
            <label><span>Default slot</span><select name="defaultMealSlot" defaultValue=""><option value="">Use selected quick-log slot</option><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="DINNER">Dinner</option><option value="SNACK">Snack</option></select></label>
            <fieldset><legend>Foods and servings</legend>{data.foods.map((food) => <label key={food.id}><input type="checkbox" checked={Boolean(mealFoods[food.id])} onChange={(event) => setMealFoods((current) => ({ ...current, [food.id]: event.target.checked ? 1 : 0 }))} /><span>{food.name}</span>{mealFoods[food.id] ? <input aria-label={`${food.name} servings`} type="number" min="0.01" step="0.01" value={mealFoods[food.id]} onChange={(event) => setMealFoods((current) => ({ ...current, [food.id]: Number(event.target.value) }))} /> : null}</label>)}</fieldset><button disabled={pending}>Save reusable meal</button>
          </form>
        </article>

        <article className={styles.nutritionCard}>
          <div className={styles.panelHeading}><div><small>Explainable comparison</small><h2>Same-calorie alternatives</h2></div><Apple /></div>
          <label className={styles.comparisonPicker}><span>Compare a saved food</span><select value={comparisonFoodId} onChange={(event) => setComparisonFoodId(event.target.value)}><option value="">Choose a food</option>{data.foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select></label>
          <div className={styles.suggestionList}>{substitutions.map((item) => <div key={item.id}><strong>{item.name}</strong><p>{item.equivalentGrams === null ? "Comparable serving unavailable" : `About ${item.equivalentGrams} g at similar calories`} · {item.reasons.join(" · ")} · {item.confidence.toLowerCase()} data confidence</p></div>)}{comparisonFood && !substitutions.length ? <p className={styles.emptyCopy}>No saved option has a clearly supported improvement. Missing values are not treated as zero.</p> : null}</div>
          <p className={styles.integrationNote}>This comparison is not a validated satiety score and does not promise how filling a food will feel.</p>
        </article>

        <article className={styles.nutritionCard}><div className={styles.panelHeading}><div><small>Recent 30 days</small><h2>Food log</h2></div><Utensils /></div><div className={styles.dailyLog}>{data.logs.map((log) => <form key={log.id} action={(form) => run(() => updateFoodLog({ id: log.id, localDate: String(form.get("date")), mealSlot: String(form.get("slot")), quantity: Number(form.get("quantity")) }), "Log updated")}><b>{log.localDate.slice(5)}</b><span><strong>{log.name}</strong><small>{log.mealSlot.toLowerCase()} · {log.servingLabel} · {display(log.caloriesMilli === null ? null : Math.round(log.caloriesMilli * log.quantityMilli / 1000), "cal")} cal</small></span><input aria-label={`${log.name} quantity`} name="quantity" type="number" min="0.01" max="100" step="0.01" defaultValue={log.quantityMilli / 1000} /><input name="date" type="hidden" value={log.localDate} /><input name="slot" type="hidden" value={log.mealSlot} /><button disabled={pending}>Update</button></form>)}{!data.logs.length ? <p className={styles.emptyCopy}>Nothing logged in the last 30 days.</p> : null}</div></article>
      </div>

      <aside className={styles.nutritionSide}>
        <article className={styles.nutritionCard}><div className={styles.panelHeading}><div><small>Editable estimate</small><h2>Energy and protein</h2></div><Scale /></div>{data.proposal ? <div className={styles.proposal}><strong>{data.proposal.targetCalories} cal/day</strong><p>Estimated maintenance: {data.proposal.maintenanceCalories} cal/day (roughly {data.proposal.lowCalories}–{data.proposal.highCalories}). Proposed pace: {(data.proposal.effectiveWeeklyLossGrams / 453.59237).toFixed(1)} lb/week.</p>{data.proposal.proteinGrams ? <p>Protein proposal: {data.proposal.proteinGrams} g/day ({data.proposal.proteinGramsPerKilogram} g/kg of goal weight).</p> : <p>Set a goal weight and training choice to estimate protein.</p>}{data.proposal.limited ? <p>The proposal was limited by the configured pace or {data.proposal.minimumCalories}-calorie safeguard.</p> : null}<button disabled={pending} onClick={() => run(acceptNutritionProposal, "Calorie and protein targets accepted")}>Accept proposed targets</button></div> : <p className={styles.emptyCopy}>Save the profile below and log a current weight to generate an estimate. No target is assigned automatically.</p>}<p className={styles.integrationNote}>Maintenance and loss pace are estimates, not measurements. Stalls do not automatically lower the target.</p></article>
        <article className={styles.nutritionCard}><div className={styles.panelHeading}><div><small>Trend</small><h2>Weight</h2></div><Scale /></div><div className={styles.weightStats}><strong>{latestWeight ? gramsToWeight(latestWeight, unit).toFixed(1) : "—"}<small>{unit.toLowerCase()}</small></strong><span>7-day average: {data.rollingWeightGrams ? `${gramsToWeight(data.rollingWeightGrams, unit).toFixed(1)} ${unit.toLowerCase()}` : "not enough data"}</span></div><form className={styles.compactForm} action={(form) => run(() => saveWeight({ localDate: String(form.get("date")), value: Number(form.get("value")), unit, note: String(form.get("note") ?? "") || null }), "Weight saved")}><label><span>Date</span><input name="date" type="date" defaultValue={localDate} required /></label><label><span>Weight ({unit.toLowerCase()})</span><input name="value" type="number" min="1" max="2000" step="0.1" required /></label><label><span>Note</span><input name="note" maxLength={500} /></label><button disabled={pending}>Save weight</button></form></article>
        <article className={styles.nutritionCard}><div className={styles.panelHeading}><div><small>Reliable source</small><h2>USDA search</h2></div><Database /></div><form className={styles.searchForm} action={(form) => run(async () => setResults(await searchUsdaFoods(String(form.get("query") ?? ""))), "Search complete")}><input name="query" minLength={2} required placeholder="Search foods" /><button disabled={pending}><Search /></button></form><div className={styles.searchResults}>{results.map((result) => <div key={result.fdcId}><span><strong>{result.name}</strong><small>{result.brand ?? result.dataType}</small></span><button disabled={pending} onClick={() => run(() => importUsdaFood(result.fdcId), "Food saved")}>Save</button></div>)}</div></article>
        <ManualFoodForm pending={pending} run={run} />
        <SettingsForm data={data} pending={pending} run={run} targetDefaults={targetDefaults} />
      </aside>
    </div>
  </section>;
}

function ManualFoodForm({ pending, run }: { pending: boolean; run: (work: () => Promise<unknown>, success: string) => void }) {
  const nutrientNames = ["servingGrams", "calories", "protein", "carbs", "fat", "fiber", "water", "calcium", "potassium", "magnesium", "iron", "vitaminD", "vitaminB12", "omega3"];
  return <details className={styles.nutritionCard}><summary>Add a manual food</summary><form className={styles.compactForm} action={(form) => run(() => createFood({ name: String(form.get("name")), brand: String(form.get("brand") ?? "") || null, servingLabel: String(form.get("servingLabel")), ...Object.fromEntries(nutrientNames.map((name) => [name, numberOrNull(form.get(name))])), dataQuality: String(form.get("dataQuality")) }), "Food saved")}><label><span>Name</span><input name="name" required /></label><label><span>Brand</span><input name="brand" /></label><label><span>Serving label</span><input name="servingLabel" placeholder="1 cup" required /></label><label><span>Data quality</span><select name="dataQuality"><option value="KNOWN">Known from label/source</option><option value="ESTIMATED">Estimated</option></select></label><div className={styles.twoColumns}>{nutrientNames.map((name) => <label key={name}><span>{name.replace(/([A-Z])/g, " $1")}{["vitaminD", "vitaminB12"].includes(name) ? " (mcg)" : ["calcium", "potassium", "magnesium", "iron", "omega3"].includes(name) ? " (mg)" : name === "water" ? " (g)" : ""}</span><input name={name} type="number" min="0" step="0.01" /></label>)}</div><button disabled={pending}>Save food</button></form></details>;
}

function SettingsForm({ data, pending, run, targetDefaults }: { data: NutritionDashboardData; pending: boolean; run: (work: () => Promise<unknown>, success: string) => void; targetDefaults: Record<string, number | ""> }) {
  const unit = data.settings.weightUnit;
  const targetNames = ["targetWeight", "calorieTarget", "proteinTarget", "carbsTarget", "fatTarget", "fiberTarget", "calciumTarget", "potassiumTarget", "magnesiumTarget", "ironTarget", "vitaminDTarget", "vitaminB12Target", "omega3Target"];
  return <details className={styles.nutritionCard} open={!data.settings.ageYears}><summary>Profile, targets, and preferences</summary><form className={styles.compactForm} action={(form) => run(() => saveNutritionSettings({ weightUnit: String(form.get("weightUnit")), ...Object.fromEntries(targetNames.map((name) => [name, numberOrNull(form.get(name))])), avoidSeafood: form.get("avoidSeafood") === "on", avoidMushrooms: form.get("avoidMushrooms") === "on", maxPrepMinutes: Number(form.get("maxPrepMinutes")), preferredComplexity: String(form.get("preferredComplexity")), ageYears: numberOrNull(form.get("ageYears")), heightInches: numberOrNull(form.get("heightInches")), energyEquationSex: String(form.get("energyEquationSex") ?? "") || null, activityLevel: String(form.get("activityLevel") ?? "") || null, resistanceTraining: form.get("resistanceTraining") === "on", targetWeeklyLossPounds: numberOrNull(form.get("targetWeeklyLossPounds")), preferredFoods: terms(form.get("preferredFoods")), acceptableFoods: terms(form.get("acceptableFoods")), avoidedFoods: terms(form.get("avoidedFoods")) }), "Profile and targets saved")}>
    <div className={styles.twoColumns}><label><span>Age</span><input name="ageYears" type="number" min="18" max="120" defaultValue={data.settings.ageYears ?? 30} /></label><label><span>Height (inches)</span><input name="heightInches" type="number" min="36" max="108" step="0.1" defaultValue={data.settings.heightMillimeters ? data.settings.heightMillimeters / 25.4 : 70} /></label></div>
    <label><span>Energy equation sex</span><select name="energyEquationSex" defaultValue={data.settings.energyEquationSex ?? "MALE"}><option value="MALE">Male equation</option><option value="FEMALE">Female equation</option></select></label><label><span>Activity level</span><select name="activityLevel" defaultValue={data.settings.activityLevel ?? "SEDENTARY"}><option value="SEDENTARY">Mostly sedentary</option><option value="LIGHT">Lightly active</option><option value="MODERATE">Moderately active</option><option value="VERY_ACTIVE">Very active</option></select></label><label className={styles.checkRow}><input name="resistanceTraining" type="checkbox" defaultChecked={data.settings.resistanceTraining ?? true} /><span>Regular resistance training planned</span></label><label><span>Desired weekly loss (lb)</span><input name="targetWeeklyLossPounds" type="number" min="0.25" max="2" step="0.25" defaultValue={data.settings.targetWeeklyLossGrams ? data.settings.targetWeeklyLossGrams / 453.59237 : 1.5} /></label>
    <label><span>Weight unit</span><select name="weightUnit" defaultValue={unit}><option value="LB">Pounds</option><option value="KG">Kilograms</option></select></label>{targetNames.map((name) => <label key={name}><span>{name.replace(/([A-Z])/g, " $1")}{["vitaminDTarget", "vitaminB12Target"].includes(name) ? " (mcg)" : ["calciumTarget", "potassiumTarget", "magnesiumTarget", "ironTarget", "omega3Target"].includes(name) ? " (mg)" : ""}</span><input name={name} type="number" min="0" step="0.1" defaultValue={targetDefaults[name]} /></label>)}
    <label><span>Preferred foods, comma separated</span><textarea name="preferredFoods" defaultValue={(data.settings.preferenceProfileSet ? data.settings.preferredFoods : initialPreferences.preferred).join(", ")} /></label><label><span>Acceptable foods, comma separated</span><textarea name="acceptableFoods" defaultValue={(data.settings.preferenceProfileSet ? data.settings.acceptableFoods : initialPreferences.acceptable).join(", ")} /></label><label><span>Avoided foods, comma separated</span><textarea name="avoidedFoods" defaultValue={(data.settings.preferenceProfileSet ? data.settings.avoidedFoods : initialPreferences.avoided).join(", ")} /></label>
    <label className={styles.checkRow}><input name="avoidSeafood" type="checkbox" defaultChecked={data.settings.avoidSeafood} /><span>Avoid seafood and fish</span></label><label className={styles.checkRow}><input name="avoidMushrooms" type="checkbox" defaultChecked={data.settings.avoidMushrooms} /><span>Avoid mushrooms</span></label><label><span>Maximum prep minutes</span><input name="maxPrepMinutes" type="number" min="5" max="480" defaultValue={data.settings.maxPrepMinutes} /></label><label><span>Preferred complexity</span><select name="preferredComplexity" defaultValue={data.settings.preferredComplexity}><option value="SIMPLE">Simple</option><option value="MODERATE">Moderate</option><option value="INVOLVED">Involved</option></select></label><button disabled={pending}>Save profile and targets</button>
  </form></details>;
}
