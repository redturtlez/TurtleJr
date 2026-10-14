"use client";

import { Plus, Trash } from "public/svg";
import type { ChangeEvent, ReactNode } from "react";
import { useProteinCostStore } from "./proteinCostStates";
import styles from "./protein-cost.module.css";

type ProteinItem = ReturnType<typeof useProteinCostStore.getState>["items"][number];

function valueFor(item: ProteinItem): number | null {
  if (item.servings == null || item.proteinPerServing == null || item.price == null || item.price <= 0) return null;
  return (item.servings * item.proteinPerServing) / item.price;
}

function NumberField({ id, label, value, suffix, step = "1", onChange }: { id: string; label: string; value: number | null; suffix: string; step?: string; onChange: (value: number | null) => void }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => onChange(event.currentTarget.value === "" ? null : event.currentTarget.valueAsNumber);
  return <label className={styles.field} htmlFor={id}><span>{label}</span><div><input id={id} type="number" min="0" step={step} inputMode="decimal" value={value ?? ""} onChange={handleChange} /><small>{suffix}</small></div></label>;
}

function Metric({ label, value, note, accent = false }: { label: string; value: ReactNode; note: string; accent?: boolean }) {
  return <div className={`${styles.metric} ${accent ? styles.accentMetric : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

export default function Content() {
  const store = useProteinCostStore();
  const active = store.items[store.activeItem] ?? store.items[0]!;
  const activeValue = valueFor(active);
  const completed = store.items.map((item, index) => ({ index, value: valueFor(item) })).filter((entry): entry is { index: number; value: number } => entry.value != null);
  const bestIndex = completed.reduce((best, entry) => best == null || entry.value > best.value ? entry : best, null as { index: number; value: number } | null)?.index;
  const complete = activeValue != null && active.caloriesPerServing != null;
  const totalProtein = complete ? active.servings! * active.proteinPerServing! : null;
  const totalCalories = complete ? active.servings! * active.caloriesPerServing! : null;

  return (
    <div className={styles.workspace}>
      <aside className={styles.rail} aria-label="Items being compared">
        <div className={styles.railHeader}><div><small>Comparison</small><strong>{store.items.length} of 6 items</strong></div><button type="button" onClick={store.addItem} disabled={store.items.length >= 6} aria-label="Add comparison item"><Plus /></button></div>
        <div className={styles.itemList}>
          {store.items.map((item, index) => {
            const itemValue = valueFor(item);
            return <button type="button" key={index} className={`${styles.itemButton} ${store.activeItem === index ? styles.activeItem : ""}`} onClick={() => store.setActiveItem(index)} aria-pressed={store.activeItem === index}>
              <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.item?.trim() || `Item ${index + 1}`}</strong><small>{itemValue == null ? "Needs details" : `${itemValue.toFixed(2)}g / $`}</small></div>{bestIndex === index && completed.length > 1 ? <i>Best</i> : null}
            </button>;
          })}
        </div>
        <button type="button" className={styles.deleteButton} disabled={store.items.length <= 1} onClick={() => store.deleteItem(store.activeItem)}><Trash /><span>Remove selected</span></button>
      </aside>

      <div className={styles.editor}>
        <div className={styles.editorHeading}><div><small>Selected item</small><h2>{active.item?.trim() || `Item ${store.activeItem + 1}`}</h2></div><span>{String(store.activeItem + 1).padStart(2, "0")}</span></div>
        <div className={styles.form}>
          <label className={`${styles.field} ${styles.nameField}`} htmlFor="protein-item-name"><span>Item name</span><div><input id="protein-item-name" type="text" value={active.item ?? ""} placeholder="e.g. Greek yogurt" onChange={(event) => store.setItemName(store.activeItem, event.currentTarget.value === "" ? null : event.currentTarget.value)} /></div></label>
          <NumberField id="protein-servings" label="Servings" value={active.servings} suffix="total" step="1" onChange={(value) => store.setServings(store.activeItem, value)} />
          <NumberField id="protein-per-serving" label="Protein per serving" value={active.proteinPerServing} suffix="grams" step="0.1" onChange={(value) => store.setProteinPerServing(store.activeItem, value)} />
          <NumberField id="protein-calories" label="Calories per serving" value={active.caloriesPerServing} suffix="kcal" step="1" onChange={(value) => store.setCaloriesPerServing(store.activeItem, value)} />
          <NumberField id="protein-price" label="Total price" value={active.price} suffix="USD" step="0.01" onChange={(value) => store.setPrice(store.activeItem, value)} />
        </div>
      </div>

      <aside className={styles.results} aria-live="polite">
        <div className={styles.resultsHeading}><small>Value snapshot</small>{complete && completed.length > 1 ? <span className={bestIndex === store.activeItem ? styles.best : styles.notBest}>{bestIndex === store.activeItem ? "Best value" : "Keep comparing"}</span> : <span className={styles.pending}>Live result</span>}</div>
        <Metric label="Protein per dollar" value={complete ? <>{activeValue!.toFixed(2)}<em>g</em></> : "—"} note="Primary comparison" accent />
        <div className={styles.metricGrid}>
          <Metric label="Total protein" value={totalProtein == null ? "—" : <>{totalProtein.toFixed(0)}<em>g</em></>} note="Across all servings" />
          <Metric label="Total calories" value={totalCalories == null ? "—" : totalCalories.toLocaleString()} note="Across all servings" />
        </div>
        <p className={styles.resultHint}>{complete ? completed.length > 1 ? "Values update instantly as you edit each item." : "Add another complete item to compare value." : "Complete the nutrition and price fields to see results."}</p>
      </aside>
    </div>
  );
}
