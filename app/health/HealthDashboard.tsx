"use client";

import { Apple, ArrowDown, ArrowUp, Archive, BarChart3, Bell, CalendarCheck, Check, ChefHat, ChevronRight, Clock3, Dumbbell, ExternalLink, Flag, HeartPulse, ListChecks, Pencil, Plus, RotateCcw, Settings2, SkipForward, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "react-toastify";
import ActivityForm from "./ActivityForm";
import GoalsPanel from "./GoalsPanel";
import InsightsPanel from "./InsightsPanel";
import NutritionPanel from "./NutritionPanel";
import NotificationPanel from "./NotificationPanel";
import type { NotificationDashboardData } from "./notificationData";
import type { NutritionDashboardData } from "./nutritionData";
import PlanningPanel from "./PlanningPanel";
import type { PlanningDashboardData } from "./planningData";
import WellnessPanel from "./WellnessPanel";
import type { WellnessDashboardData } from "./wellnessData";
import { archiveActivity, clearActivityStatus, moveActivity, setActivityStatus, updateTimeZone } from "./actions";
import type { LifeDashboardData } from "./data";
import { getLocalDayContext, activitiesForDay, formatMinutes, selectNextActivity } from "./scheduling";
import { inAppReminderCandidates, isWithinQuietHours } from "./notifications";
import styles from "./health.module.css";

export interface DashboardTask {
  title: string;
  priority: number;
  dueDate: string | null;
}

interface HealthDashboardProps {
  data: LifeDashboardData;
  tasks: DashboardTask[];
  nutrition: NutritionDashboardData;
  planning: PlanningDashboardData;
  wellness: WellnessDashboardData;
  notifications: NotificationDashboardData;
}

type DashboardActivity = LifeDashboardData["activities"][number];
type View = "today" | "goals" | "nutrition" | "planning" | "wellness" | "insights" | "notifications" | "configure";

function scheduleLabel(activity: DashboardActivity): string {
  if (activity.scheduleType === "FIXED_TIME" && activity.fixedTimeMinutes !== null) return formatMinutes(activity.fixedTimeMinutes);
  if (activity.scheduleType === "FLEXIBLE_WINDOW" && activity.windowStartMinutes !== null && activity.windowEndMinutes !== null) return `${formatMinutes(activity.windowStartMinutes)}–${formatMinutes(activity.windowEndMinutes)}`;
  return activity.kind === "ROUTINE" ? "In sequence" : "Any time";
}

export default function HealthDashboard({ data, nutrition, planning, wellness, notifications, tasks }: HealthDashboardProps) {
  const [view, setView] = useState<View>("today");
  const [editing, setEditing] = useState<DashboardActivity | null>(null);
  const [pending, startTransition] = useTransition();
  const shownReminderKeys = useRef(new Set<string>());
  const completionByActivity = useMemo(() => new Map(data.completions.map((completion) => [completion.activityId, completion])), [data.completions]);
  const todayActivities = useMemo(() => activitiesForDay(data.activities, data.context.dayOfWeek), [data.activities, data.context.dayOfWeek]);
  const next = useMemo(() => selectNextActivity(data.activities, data.completions, data.context), [data]);
  const completed = todayActivities.filter((activity) => completionByActivity.get(activity.id)?.status === "COMPLETED").length;
  const skipped = todayActivities.filter((activity) => completionByActivity.get(activity.id)?.status === "SKIPPED").length;
  const progress = todayActivities.length ? Math.round((completed / todayActivities.length) * 100) : 0;

  useEffect(() => {
    if (!notifications.settings.inAppRemindersEnabled) return;
    const check = (): void => {
      const context = getLocalDayContext(new Date(), data.profile.timeZone);
      if (isWithinQuietHours(context.minutesSinceMidnight, notifications.settings.quietStartMinutes, notifications.settings.quietEndMinutes)) return;
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
  }, [data.activities, data.completions, data.profile.timeZone, notifications.settings]);

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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>Personal workspace</p><h1>Your day, <span>with room to move.</span></h1><p>Follow what matters now, adapt when plans change, and keep progress visible without chasing perfection.</p></div>
        <nav aria-label="Life Dashboard views"><button type="button" className={view === "today" ? styles.activeTab : ""} onClick={() => setView("today")}><CalendarCheck />Today</button><button type="button" className={view === "goals" ? styles.activeTab : ""} onClick={() => setView("goals")}><Flag />Goals</button><button type="button" className={view === "nutrition" ? styles.activeTab : ""} onClick={() => setView("nutrition")}><Apple />Nutrition</button><button type="button" className={view === "planning" ? styles.activeTab : ""} onClick={() => setView("planning")}><ChefHat />Plan</button><button type="button" className={view === "wellness" ? styles.activeTab : ""} onClick={() => setView("wellness")}><Dumbbell />Move & Create</button><button type="button" className={view === "insights" ? styles.activeTab : ""} onClick={() => setView("insights")}><BarChart3 />Insights</button><button type="button" className={view === "notifications" ? styles.activeTab : ""} onClick={() => setView("notifications")}><Bell />Notify</button><button type="button" className={view === "configure" ? styles.activeTab : ""} onClick={() => setView("configure")}><Settings2 />Configure</button></nav>
      </header>

      {view === "today" ? (
        <>
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
                <div className={styles.panelHeading}><div><small>{data.context.localDate}</small><h2>Today’s routine</h2></div><button type="button" className={styles.textButton} onClick={() => setView("configure")}><Plus />Add activity</button></div>
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
        </>
      ) : view === "goals" ? <GoalsPanel data={data} /> : view === "nutrition" ? <NutritionPanel data={nutrition} localDate={data.context.localDate} /> : view === "planning" ? <PlanningPanel data={planning} foods={nutrition.foods} localDate={data.context.localDate} /> : view === "wellness" ? <WellnessPanel data={wellness} localDate={data.context.localDate} /> : view === "insights" ? <InsightsPanel data={data} /> : view === "notifications" ? <NotificationPanel data={notifications} /> : (
        <section className={styles.configureGrid}>
          <div className={styles.managePanel}>
            <div className={styles.panelHeading}><div><small>{data.routine.name}</small><h2>Activities and habits</h2></div><span>{data.activities.length} total</span></div>
            <div className={styles.manageList}>{data.activities.map((activity) => <article key={activity.id}><div><b>{activity.kind === "HABIT" ? "Habit" : "Routine"}</b><strong>{activity.title}</strong><p>{scheduleLabel(activity)} · {activity.daysOfWeek.length === 7 ? "Every day" : `${activity.daysOfWeek.length} days/week`}</p></div><span><button type="button" disabled={pending} aria-label={`Move ${activity.title} up`} onClick={() => reorderActivity(activity, "UP")}><ArrowUp /></button><button type="button" disabled={pending} aria-label={`Move ${activity.title} down`} onClick={() => reorderActivity(activity, "DOWN")}><ArrowDown /></button><button type="button" aria-label={`Edit ${activity.title}`} onClick={() => setEditing(activity)}><Pencil /></button><button type="button" disabled={pending} aria-label={`Archive ${activity.title}`} onClick={() => removeActivity(activity)}><Archive /></button></span></article>)}</div>
            {!data.activities.length ? <p className={styles.emptyCopy}>Add your first routine step or habit using the form.</p> : null}
            <form className={styles.timeZoneForm} action={saveTimeZone}><label><span>Planning time zone</span><input name="timeZone" defaultValue={data.profile.timeZone} aria-describedby="timezone-help" /></label><button disabled={pending}>Save</button><small id="timezone-help">Use an IANA value such as America/New_York. This controls local day boundaries.</small></form>
          </div>
          <ActivityForm key={editing?.id ?? "new"} editing={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </section>
      )}
    </main>
  );
}
