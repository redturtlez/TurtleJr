"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { createGoal, updateGoal } from "./actions";
import type { LifeDashboardData } from "./data";
import styles from "./health.module.css";

type Goal = LifeDashboardData["goals"][number];

export default function GoalForm({ habits, editing, onSaved, onCancel }: { habits: LifeDashboardData["activities"]; editing: Goal | null; onSaved: () => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string[]>(editing?.activityIds ?? []);
  const [pending, startTransition] = useTransition();
  const submit = (formData: FormData): void => {
    const target = String(formData.get("targetValue") ?? "").trim();
    const input = {
      title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? "") || null,
      targetValue: target ? Number(target) : null, targetUnit: String(formData.get("targetUnit") ?? "") || null,
      targetDate: String(formData.get("targetDate") ?? "") || null, status: String(formData.get("status") ?? "ACTIVE"), activityIds: selected,
    };
    startTransition(async () => {
      try {
        if (editing) await updateGoal({ ...input, id: editing.id }); else await createGoal(input);
        toast.success(editing ? "Goal updated" : "Goal created"); onSaved();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save the goal"); }
    });
  };
  return <form action={submit} className={`${styles.activityForm} ${styles.goalForm}`}>
    <div className={styles.formHeading}><div><small>{editing ? "Edit goal" : "Long-term direction"}</small><h3>{editing ? editing.title : "Create a goal"}</h3></div>{editing ? <button type="button" onClick={onCancel}>Cancel</button> : null}</div>
    <label><span>Name</span><input name="title" required maxLength={120} defaultValue={editing?.title ?? ""} /></label>
    <label><span>Description</span><textarea name="description" maxLength={1000} defaultValue={editing?.description ?? ""} /></label>
    <div className={styles.twoColumns}><label><span>Target value (optional)</span><input name="targetValue" type="number" min="0.01" step="any" defaultValue={editing?.targetValue ?? ""} /></label><label><span>Unit</span><input name="targetUnit" maxLength={40} placeholder="miles, books, kg…" defaultValue={editing?.targetUnit ?? ""} /></label></div>
    <div className={styles.twoColumns}><label><span>Target date</span><input name="targetDate" type="date" defaultValue={editing?.targetDate ?? ""} /></label><label><span>Status</span><select name="status" defaultValue={editing?.status ?? "ACTIVE"}><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option></select></label></div>
    <fieldset className={styles.goalHabits}><legend>Supporting habits</legend>{habits.length ? habits.map((habit) => <label key={habit.id}><input type="checkbox" checked={selected.includes(habit.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, habit.id] : current.filter((id) => id !== habit.id))} /><span>{habit.title}</span></label>) : <small>Create a habit in Configure to link it here.</small>}</fieldset>
    <button className={styles.primaryButton} disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Create goal"}</button>
  </form>;
}
