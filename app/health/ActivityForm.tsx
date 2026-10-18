"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { createActivity, updateActivity } from "./actions";
import type { LifeDashboardData } from "./data";
import styles from "./health.module.css";

type DashboardActivity = LifeDashboardData["activities"][number];

interface ActivityFormProps {
  editing: DashboardActivity | null;
  onSaved: () => void;
  onCancel: () => void;
}

const weekdayOptions = [
  { value: 0, label: "S" }, { value: 1, label: "M" }, { value: 2, label: "T" },
  { value: 3, label: "W" }, { value: 4, label: "T" }, { value: 5, label: "F" }, { value: 6, label: "S" },
];

function timeValue(minutes: number | null): string {
  if (minutes === null) return "";
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function parseTime(value: string): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return Number.isInteger(hour) && Number.isInteger(minute) ? (hour ?? 0) * 60 + (minute ?? 0) : null;
}

function parseDuration(value: string): number | null {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) ? parsed : null;
}

export default function ActivityForm({ editing, onSaved, onCancel }: ActivityFormProps) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<DashboardActivity["kind"]>("ROUTINE");
  const [scheduleType, setScheduleType] = useState<DashboardActivity["scheduleType"]>("SEQUENTIAL");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    setKind(editing?.kind ?? "ROUTINE");
    setScheduleType(editing?.scheduleType ?? "SEQUENTIAL");
    setDays(editing?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
  }, [editing]);

  const submit = (formData: FormData): void => {
    const input = {
      kind,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      scheduleType,
      fixedTimeMinutes: parseTime(String(formData.get("fixedTime") ?? "")),
      windowStartMinutes: parseTime(String(formData.get("windowStart") ?? "")),
      windowEndMinutes: parseTime(String(formData.get("windowEnd") ?? "")),
      estimatedDurationMinutes: parseDuration(String(formData.get("estimatedDuration") ?? "")),
      minimumDurationMinutes: parseDuration(String(formData.get("minimumDuration") ?? "")),
      preferredDurationMinutes: parseDuration(String(formData.get("preferredDuration") ?? "")),
      daysOfWeek: days,
      importance: formData.get("importance") === "ESSENTIAL" ? "ESSENTIAL" as const : "OPTIONAL" as const,
      reminderEnabled: formData.get("reminderEnabled") === "on",
    };
    startTransition(async () => {
      try {
        if (editing) await updateActivity({ ...input, id: editing.id });
        else await createActivity(input);
        toast.success(editing ? "Activity updated" : "Activity added");
        onSaved();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save the activity");
      }
    });
  };

  const toggleDay = (day: number): void => {
    setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].toSorted());
  };

  return (
    <form className={styles.activityForm} action={submit}>
      <div className={styles.formHeading}>
        <div><small>{editing ? "Edit activity" : "New activity"}</small><h3>{editing ? editing.title : "Build your day"}</h3></div>
        {editing ? <button type="button" onClick={onCancel}>Cancel</button> : null}
      </div>
      <div className={styles.twoColumns}>
        <label><span>Activity type</span><select value={kind} onChange={(event) => setKind(event.target.value as DashboardActivity["kind"])}><option value="ROUTINE">Routine step</option><option value="HABIT">Habit</option></select></label>
        <label><span>Importance</span><select name="importance" defaultValue={editing?.importance ?? "OPTIONAL"}><option value="OPTIONAL">Optional</option><option value="ESSENTIAL">Essential</option></select></label>
      </div>
      <label><span>Name</span><input name="title" required maxLength={120} defaultValue={editing?.title ?? ""} placeholder="e.g. Morning workout" /></label>
      <label><span>Description</span><textarea name="description" maxLength={500} defaultValue={editing?.description ?? ""} placeholder="A short, useful prompt for this activity" /></label>
      <label><span>Scheduling</span><select value={scheduleType} onChange={(event) => setScheduleType(event.target.value as DashboardActivity["scheduleType"])}><option value="SEQUENTIAL">Sequential</option><option value="FIXED_TIME">Fixed time</option><option value="FLEXIBLE_WINDOW">Flexible window</option></select></label>
      {scheduleType === "FIXED_TIME" ? <label><span>Fixed time</span><input name="fixedTime" required type="time" defaultValue={timeValue(editing?.fixedTimeMinutes ?? null)} /></label> : null}
      {scheduleType === "FLEXIBLE_WINDOW" ? <div className={styles.twoColumns}><label><span>Window starts</span><input name="windowStart" required type="time" defaultValue={timeValue(editing?.windowStartMinutes ?? null)} /></label><label><span>Window ends</span><input name="windowEnd" required type="time" defaultValue={timeValue(editing?.windowEndMinutes ?? null)} /></label></div> : null}
      <fieldset className={styles.days}><legend>Scheduled days</legend><div>{weekdayOptions.map((day, index) => <button type="button" key={`${day.value}-${index}`} aria-pressed={days.includes(day.value)} onClick={() => toggleDay(day.value)}>{day.label}</button>)}</div></fieldset>
      <div className={styles.threeColumns}>
        <label><span>Estimate (min)</span><input name="estimatedDuration" inputMode="numeric" type="number" min="1" max="720" defaultValue={editing?.estimatedDurationMinutes ?? ""} /></label>
        <label><span>Minimum</span><input name="minimumDuration" inputMode="numeric" type="number" min="1" max="720" defaultValue={editing?.minimumDurationMinutes ?? ""} /></label>
        <label><span>Preferred</span><input name="preferredDuration" inputMode="numeric" type="number" min="1" max="720" defaultValue={editing?.preferredDurationMinutes ?? ""} /></label>
      </div>
      <label className={styles.checkRow}><input name="reminderEnabled" type="checkbox" defaultChecked={editing?.reminderEnabled ?? false} /><span>Include this activity in reminders <small>Uses your in-app, scheduled-push, and daily-digest preferences.</small></span></label>
      <button className={styles.primaryButton} type="submit" disabled={pending || days.length === 0}>{pending ? "Saving…" : editing ? "Save changes" : "Add activity"}</button>
    </form>
  );
}
