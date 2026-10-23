"use client";

import { Check, ChevronRight, Clock3, ExternalLink, HeartPulse, ListChecks, Plus, RotateCcw, SkipForward, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useTransition } from "react";
import { toast } from "react-toastify";
import { clearActivityStatus, setActivityStatus } from "./actions";
import type { TodayDashboardData } from "./data";
import type { ReminderSettingsData } from "./notificationData";
import { inAppReminderCandidates, isWithinQuietHours } from "./notifications";
import { activitiesForDay, formatMinutes, getLocalDayContext, selectNextActivity } from "./scheduling";
import styles from "./health.module.css";

export interface DashboardTask {
  title: string;
  priority: number;
  dueDate: string | null;
}

type DashboardActivity = TodayDashboardData["activities"][number];

function scheduleLabel(activity: DashboardActivity): string {
  if (activity.scheduleType === "FIXED_TIME" && activity.fixedTimeMinutes !== null) return formatMinutes(activity.fixedTimeMinutes);
  if (activity.scheduleType === "FLEXIBLE_WINDOW" && activity.windowStartMinutes !== null && activity.windowEndMinutes !== null) return `${formatMinutes(activity.windowStartMinutes)}–${formatMinutes(activity.windowEndMinutes)}`;
  return activity.kind === "ROUTINE" ? "In sequence" : "Any time";
}

export default function TodayDashboard({ data, reminders, tasks }: { data: TodayDashboardData; reminders: ReminderSettingsData; tasks: DashboardTask[] }) {
  const [pending, startTransition] = useTransition();
  const shownReminderKeys = useRef(new Set<string>());
  const completionByActivity = useMemo(() => new Map(data.completions.map((completion) => [completion.activityId, completion])), [data.completions]);
  const todayActivities = useMemo(() => activitiesForDay(data.activities, data.context.dayOfWeek), [data.activities, data.context.dayOfWeek]);
  const next = useMemo(() => selectNextActivity(data.activities, data.completions, data.context), [data]);
  const completed = todayActivities.filter((activity) => completionByActivity.get(activity.id)?.status === "COMPLETED").length;
  const skipped = todayActivities.filter((activity) => completionByActivity.get(activity.id)?.status === "SKIPPED").length;
  const progress = todayActivities.length ? Math.round((completed / todayActivities.length) * 100) : 0;

  useEffect(() => {
    if (!reminders.inAppRemindersEnabled) return;
    const check = (): void => {
      const context = getLocalDayContext(new Date(), data.profile.timeZone);
      if (isWithinQuietHours(context.minutesSinceMidnight, reminders.quietStartMinutes, reminders.quietEndMinutes)) return;
      for (const activity of inAppReminderCandidates(data.activities, data.completions, context)) {
        const scheduledAt = activity.scheduleType === "FIXED_TIME" ? activity.fixedTimeMinutes : activity.windowStartMinutes;
        const key = `life-reminder:${context.localDate}:${activity.id}:${scheduledAt ?? "none"}`;
        if (shownReminderKeys.current.has(key)) continue;
        try {
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, "shown");
        } catch { /* A blocked storage API should not block the reminder itself. */ }
        shownReminderKeys.current.add(key);
        toast.info(`${activity.title} is ready to start.`);
      }
    };
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [data.activities, data.completions, data.profile.timeZone, reminders]);

  const changeStatus = (activity: DashboardActivity, status: "COMPLETED" | "SNOOZED" | "SKIPPED"): void => {
    startTransition(async () => {
      try {
        await setActivityStatus({ activityId: activity.id, localDate: data.context.localDate, status, durationMinutes: status === "COMPLETED" ? activity.preferredDurationMinutes : null });
        toast.success(status === "COMPLETED" ? "Activity completed" : status === "SNOOZED" ? "Snoozed for 30 minutes" : "Activity skipped for today");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update the activity");
      }
    });
  };

  const resetStatus = (activity: DashboardActivity): void => {
    startTransition(async () => {
      try { await clearActivityStatus({ activityId: activity.id, localDate: data.context.localDate }); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not reset the activity"); }
    });
  };

  return <>
    <section className={styles.metrics} aria-label="Daily progress">
      <article className={styles.progressCard}><div><span>Daily progress</span><strong>{progress}%</strong></div><div className={styles.progressTrack}><i style={{ width: `${progress}%` }} /></div><small>{completed} complete · {todayActivities.length - completed - skipped} remaining{skipped ? ` · ${skipped} skipped` : ""}</small></article>
      <article><HeartPulse /><span>Planned</span><strong>{todayActivities.length}</strong><small>activities today</small></article>
      <article><ListChecks /><span>Tasks due</span><strong>{tasks.length}</strong><small>from your To Do list</small></article>
    </section>

    <section className={styles.todayGrid}>
      <div className={styles.primaryColumn}>
        <article className={styles.nextCard}>
          <div className={styles.panelHeading}><div><small>What should I do now?</small><h2>{next ? "Up next" : "You are caught up"}</h2></div><Sparkles /></div>
          {next ? <><div className={styles.nextActivity}><span>{next.reason}</span><h3>{next.activity.title}</h3><p>{next.activity.estimatedDurationMinutes ? `About ${next.activity.estimatedDurationMinutes} minutes` : scheduleLabel(next.activity as DashboardActivity)}</p></div><div className={styles.nextActions}><button disabled={pending} onClick={() => changeStatus(next.activity as DashboardActivity, "COMPLETED")}><Check />Complete</button><button disabled={pending} onClick={() => changeStatus(next.activity as DashboardActivity, "SNOOZED")}><TimerReset />Snooze</button><button disabled={pending} onClick={() => changeStatus(next.activity as DashboardActivity, "SKIPPED")}><SkipForward />Skip</button></div></> : <p className={styles.emptyCopy}>Nothing else is scheduled for today. Add a routine step or habit whenever you are ready.</p>}
        </article>

        <section className={styles.activityPanel}>
          <div className={styles.panelHeading}><div><small>{data.context.localDate}</small><h2>Today’s routine</h2></div><Link className={styles.textButton} href="/health/configure"><Plus />Add activity</Link></div>
          <div className={styles.activityList}>{todayActivities.length ? todayActivities.map((activity) => {
            const completion = completionByActivity.get(activity.id);
            return <article className={styles.activityRow} data-status={completion?.status ?? "PENDING"} key={activity.id}><button type="button" className={styles.completeButton} disabled={pending} aria-label={completion?.status === "COMPLETED" ? `Reset ${activity.title}` : `Complete ${activity.title}`} onClick={() => completion ? resetStatus(activity) : changeStatus(activity, "COMPLETED")}>{completion?.status === "COMPLETED" ? <Check /> : completion?.status === "SNOOZED" ? <Clock3 /> : completion?.status === "SKIPPED" ? <SkipForward /> : <span />}</button><div><strong>{activity.title}</strong><p>{activity.kind === "HABIT" ? "Habit" : "Routine"} · {scheduleLabel(activity)}{activity.importance === "ESSENTIAL" ? " · Essential" : ""}</p></div>{!completion ? <button type="button" className={styles.rowAction} onClick={() => changeStatus(activity, "SNOOZED")} aria-label={`Snooze ${activity.title}`}><TimerReset /></button> : <button type="button" className={styles.rowAction} onClick={() => resetStatus(activity)} aria-label={`Reset ${activity.title}`}><RotateCcw /></button>}</article>;
          }) : <p className={styles.emptyCopy}>Your schedule is open. Configure the first activity to begin.</p>}</div>
        </section>
      </div>

      <aside className={styles.taskPanel}>
        <div className={styles.panelHeading}><div><small>Existing app</small><h2>Important tasks</h2></div><ListChecks /></div>
        <div className={styles.taskList}>{tasks.length ? tasks.slice(0, 6).map((task, index) => <div key={`${task.title}-${index}`}><i data-priority={task.priority} /><span><strong>{task.title}</strong><small>{task.dueDate === data.context.localDate ? "Due today" : "Overdue"}</small></span><ChevronRight /></div>) : <p className={styles.emptyCopy}>No tasks are due today.</p>}</div>
        <Link href="/todo">Open To Do <ExternalLink /></Link>
        <p className={styles.integrationNote}>Task completion remains in To Do until durable task history is added.</p>
      </aside>
    </section>
  </>;
}
