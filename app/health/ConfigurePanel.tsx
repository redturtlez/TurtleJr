"use client";

import { Archive, ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import ActivityForm from "./ActivityForm";
import { archiveActivity, moveActivity, updateTimeZone } from "./actions";
import type { ConfigureDashboardData } from "./data";
import { formatMinutes } from "./scheduling";
import styles from "./health.module.css";

type DashboardActivity = ConfigureDashboardData["activities"][number];

function scheduleLabel(activity: DashboardActivity): string {
  if (activity.scheduleType === "FIXED_TIME" && activity.fixedTimeMinutes !== null) return formatMinutes(activity.fixedTimeMinutes);
  if (activity.scheduleType === "FLEXIBLE_WINDOW" && activity.windowStartMinutes !== null && activity.windowEndMinutes !== null) return `${formatMinutes(activity.windowStartMinutes)}–${formatMinutes(activity.windowEndMinutes)}`;
  return activity.kind === "ROUTINE" ? "In sequence" : "Any time";
}

export default function ConfigurePanel({ data }: { data: ConfigureDashboardData }) {
  const [editing, setEditing] = useState<DashboardActivity | null>(null);
  const [pending, startTransition] = useTransition();

  const removeActivity = (activity: DashboardActivity): void => {
    if (!window.confirm(`Archive “${activity.title}”? Past completion history will be preserved.`)) return;
    startTransition(async () => {
      try { await archiveActivity(activity.id); toast.success("Activity archived"); if (editing?.id === activity.id) setEditing(null); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not archive the activity"); }
    });
  };

  const reorderActivity = (activity: DashboardActivity, direction: "UP" | "DOWN"): void => {
    startTransition(async () => {
      try { await moveActivity({ id: activity.id, direction }); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not reorder the activity"); }
    });
  };

  const saveTimeZone = (formData: FormData): void => {
    startTransition(async () => {
      try { await updateTimeZone(String(formData.get("timeZone") ?? "")); toast.success("Time zone updated"); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not update the time zone"); }
    });
  };

  return <section className={styles.configureGrid}>
    <div className={styles.managePanel}>
      <div className={styles.panelHeading}><div><small>{data.routine.name}</small><h2>Activities and habits</h2></div><span>{data.activities.length} total</span></div>
      <div className={styles.manageList}>{data.activities.map((activity) => <article key={activity.id}><div><b>{activity.kind === "HABIT" ? "Habit" : "Routine"}</b><strong>{activity.title}</strong><p>{scheduleLabel(activity)} · {activity.daysOfWeek.length === 7 ? "Every day" : `${activity.daysOfWeek.length} days/week`}</p></div><span><button type="button" disabled={pending} aria-label={`Move ${activity.title} up`} onClick={() => reorderActivity(activity, "UP")}><ArrowUp /></button><button type="button" disabled={pending} aria-label={`Move ${activity.title} down`} onClick={() => reorderActivity(activity, "DOWN")}><ArrowDown /></button><button type="button" aria-label={`Edit ${activity.title}`} onClick={() => setEditing(activity)}><Pencil /></button><button type="button" disabled={pending} aria-label={`Archive ${activity.title}`} onClick={() => removeActivity(activity)}><Archive /></button></span></article>)}</div>
      {!data.activities.length ? <p className={styles.emptyCopy}>Add your first routine step or habit using the form.</p> : null}
      <form className={styles.timeZoneForm} action={saveTimeZone}><label><span>Planning time zone</span><input name="timeZone" defaultValue={data.profile.timeZone} aria-describedby="timezone-help" /></label><button disabled={pending}>Save</button><small id="timezone-help">Use an IANA value such as America/New_York. This controls local day boundaries.</small></form>
    </div>
    <ActivityForm key={editing?.id ?? "new"} editing={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
  </section>;
}
