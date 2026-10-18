"use client";

import { CheckCircle2, Flag, PauseCircle, Pencil, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { addGoalProgress } from "./actions";
import type { LifeDashboardData } from "./data";
import GoalForm from "./GoalForm";
import styles from "./health.module.css";

type Goal = LifeDashboardData["goals"][number];

export default function GoalsPanel({ data }: { data: LifeDashboardData }) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const [pending, startTransition] = useTransition();
  const habits = data.activities.filter((activity) => activity.kind === "HABIT");
  const record = (goal: Goal, formData: FormData): void => {
    const rawValue = String(formData.get("value") ?? "").trim();
    startTransition(async () => {
      try { await addGoalProgress({ goalId: goal.id, localDate: data.context.localDate, value: rawValue ? Number(rawValue) : null, note: String(formData.get("note") ?? "") || null }); toast.success("Progress recorded"); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not record progress"); }
    });
  };
  return <section className={styles.goalsGrid}>
    <div className={styles.goalsList}>
      <div className={styles.sectionLead}><small>Goals and progress</small><h2>Keep direction visible.</h2><p>Numeric and qualitative goals stay distinct. Notes are valid progress; percentages only appear when a target and measurement exist.</p></div>
      {data.goals.length ? data.goals.map((goal) => {
        const latestValue = goal.progress.find((item) => item.value !== null)?.value ?? null;
        const percent = goal.targetValue && latestValue !== null ? Math.min(100, Math.round((latestValue / goal.targetValue) * 100)) : null;
        const linked = habits.filter((habit) => goal.activityIds.includes(habit.id));
        return <article className={styles.goalCard} key={goal.id}>
          <header><div>{goal.status === "COMPLETED" ? <CheckCircle2 /> : goal.status === "PAUSED" ? <PauseCircle /> : <Flag />}<span>{goal.status.toLowerCase()}</span></div><button type="button" aria-label={`Edit ${goal.title}`} onClick={() => setEditing(goal)}><Pencil /></button></header>
          <h3>{goal.title}</h3>{goal.description ? <p>{goal.description}</p> : null}
          {percent !== null ? <div className={styles.goalMeasure}><strong>{latestValue} <small>{goal.targetUnit}</small></strong><span>{percent}% of {goal.targetValue} {goal.targetUnit}</span><i><b style={{ width: `${percent}%` }} /></i></div> : <p className={styles.qualitative}>{goal.progress.length ? `${goal.progress.length} progress update${goal.progress.length === 1 ? "" : "s"} recorded` : "Qualitative goal — add notes to capture progress"}</p>}
          {linked.length ? <div className={styles.linkedHabits}>{linked.map((habit) => <span key={habit.id}>{habit.title}</span>)}</div> : null}
          <form className={styles.progressForm} action={(formData) => record(goal, formData)}>{goal.targetValue !== null ? <input name="value" type="number" min="0" step="any" placeholder={`Current ${goal.targetUnit ?? "value"}`} /> : null}<input name="note" maxLength={1000} placeholder="Add a progress note" /><button disabled={pending}><TrendingUp />Record</button></form>
          {goal.progress[0] ? <small className={styles.latestNote}>{goal.progress[0].localDate}{goal.progress[0].note ? ` · ${goal.progress[0].note}` : ""}</small> : null}
        </article>;
      }) : <p className={styles.emptyCopy}>No goals yet. Create one with or without a numeric target.</p>}
    </div>
    <GoalForm key={editing?.id ?? "new"} habits={habits} editing={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
  </section>;
}
