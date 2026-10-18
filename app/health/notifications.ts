import { activitiesForDay, type ActivityCompletionSummary, type LocalDayContext, type ScheduledActivity } from "./scheduling.ts";

export interface ReminderActivity extends ScheduledActivity {
  reminderEnabled: boolean;
}

export interface ReminderCompletion extends ActivityCompletionSummary {
  localDate: string;
  snoozedLocalDate?: string | null;
  snoozedMinutes?: number | null;
}

export interface ReminderOccurrence {
  activityId: string;
  title: string;
  localDate: string;
  scheduledMinutes: number;
  fingerprint: string;
}

const CATCH_UP_MINUTES = 90;

export function isWithinQuietHours(minutes: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null || start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function isOutstanding(activityId: string, completions: ActivityCompletionSummary[], now: Date): boolean {
  const completion = completions.find((item) => item.activityId === activityId);
  if (!completion) return true;
  if (completion.status === "COMPLETED" || completion.status === "SKIPPED") return false;
  return !completion.snoozedUntil || new Date(completion.snoozedUntil) <= now;
}

export function outstandingReminderActivities<T extends ReminderActivity>(activities: T[], completions: ActivityCompletionSummary[], context: LocalDayContext): T[] {
  const now = new Date(context.nowIso);
  return activitiesForDay(activities, context.dayOfWeek).filter((activity) => activity.reminderEnabled && isOutstanding(activity.id, completions, now));
}

export function inAppReminderCandidates<T extends ReminderActivity>(activities: T[], completions: ActivityCompletionSummary[], context: LocalDayContext): T[] {
  return outstandingReminderActivities(activities, completions, context).filter((activity) => {
    if (activity.scheduleType === "FIXED_TIME" && activity.fixedTimeMinutes !== null) {
      const delta = context.minutesSinceMidnight - activity.fixedTimeMinutes;
      return delta >= 0 && delta <= 5;
    }
    if (activity.scheduleType === "FLEXIBLE_WINDOW" && activity.windowStartMinutes !== null) {
      const delta = context.minutesSinceMidnight - activity.windowStartMinutes;
      return delta >= 0 && delta <= 5;
    }
    return false;
  });
}

export function dailyDigestBody(activities: Array<Pick<ReminderActivity, "title">>, showActivityNames: boolean, period: "today" | "yesterday" = "today"): string {
  const periodText = period === "today" ? "today" : "from yesterday";
  if (!showActivityNames) return `${activities.length} reminder-enabled ${activities.length === 1 ? "activity is" : "activities are"} still open ${periodText}.`;
  const visible = activities.slice(0, 3).map((activity) => activity.title);
  const extra = activities.length - visible.length;
  return `${visible.join(" · ")}${extra > 0 ? ` · +${extra} more` : ""}`;
}

export function dailyDigestFingerprint(localDate: string): string {
  return `daily-digest:${localDate}`;
}

function dateOrdinal(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid local date");
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function shiftLocalDate(localDate: string, days: number): string {
  const shifted = new Date((dateOrdinal(localDate) + days) * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

export function weekdayForLocalDate(localDate: string): number {
  return new Date(dateOrdinal(localDate) * 86_400_000).getUTCDay();
}

function occurrenceReleaseMinute(
  localDate: string,
  scheduledMinutes: number,
  quietStartMinutes: number | null,
  quietEndMinutes: number | null,
): number {
  const occurrence = dateOrdinal(localDate) * 1440 + scheduledMinutes;
  if (!isWithinQuietHours(scheduledMinutes, quietStartMinutes, quietEndMinutes)) return occurrence;
  if (quietStartMinutes === null || quietEndMinutes === null) return occurrence;
  if (quietStartMinutes < quietEndMinutes) return dateOrdinal(localDate) * 1440 + quietEndMinutes;
  return (dateOrdinal(localDate) + (scheduledMinutes >= quietStartMinutes ? 1 : 0)) * 1440 + quietEndMinutes;
}

export function occurrenceIsDue(
  localDate: string,
  scheduledMinutes: number,
  context: LocalDayContext,
  quietStartMinutes: number | null,
  quietEndMinutes: number | null,
): boolean {
  if (isWithinQuietHours(context.minutesSinceMidnight, quietStartMinutes, quietEndMinutes)) return false;
  const current = dateOrdinal(context.localDate) * 1440 + context.minutesSinceMidnight;
  const released = occurrenceReleaseMinute(localDate, scheduledMinutes, quietStartMinutes, quietEndMinutes);
  const elapsed = current - released;
  return elapsed >= 0 && elapsed <= CATCH_UP_MINUTES;
}

function scheduledMinutes(activity: ReminderActivity): number | null {
  if (activity.scheduleType === "FIXED_TIME") return activity.fixedTimeMinutes;
  if (activity.scheduleType === "FLEXIBLE_WINDOW") return activity.windowStartMinutes;
  return null;
}

export function scheduledPushReminderOccurrences<T extends ReminderActivity>(
  activities: T[],
  completions: ReminderCompletion[],
  context: LocalDayContext,
  quietStartMinutes: number | null,
  quietEndMinutes: number | null,
): ReminderOccurrence[] {
  const dates = [shiftLocalDate(context.localDate, -1), context.localDate];
  const occurrences: ReminderOccurrence[] = [];
  for (const localDate of dates) {
    const dayOfWeek = weekdayForLocalDate(localDate);
    for (const activity of activitiesForDay(activities, dayOfWeek)) {
      if (!activity.reminderEnabled) continue;
      const completion = completions.find((item) => item.activityId === activity.id && item.localDate === localDate);
      if (completion?.status === "COMPLETED" || completion?.status === "SKIPPED") continue;
      if (completion?.status === "SNOOZED") {
        if (!completion.snoozedUntil || completion.snoozedLocalDate === undefined || completion.snoozedMinutes === undefined) continue;
        if (completion.snoozedLocalDate === null || completion.snoozedMinutes === null) continue;
        if (!occurrenceIsDue(completion.snoozedLocalDate, completion.snoozedMinutes, context, quietStartMinutes, quietEndMinutes)) continue;
        occurrences.push({
          activityId: activity.id,
          title: activity.title,
          localDate,
          scheduledMinutes: completion.snoozedMinutes,
          fingerprint: `activity-reminder:${localDate}:${activity.id}:snooze:${completion.snoozedUntil}`,
        });
        continue;
      }
      const minutes = scheduledMinutes(activity);
      if (minutes === null || !occurrenceIsDue(localDate, minutes, context, quietStartMinutes, quietEndMinutes)) continue;
      occurrences.push({
        activityId: activity.id,
        title: activity.title,
        localDate,
        scheduledMinutes: minutes,
        fingerprint: `activity-reminder:${localDate}:${activity.id}:${minutes}`,
      });
    }
  }
  return occurrences;
}

export function digestIsDue(
  localDate: string,
  digestMinutes: number,
  context: LocalDayContext,
  quietStartMinutes: number | null,
  quietEndMinutes: number | null,
): boolean {
  return occurrenceIsDue(localDate, digestMinutes, context, quietStartMinutes, quietEndMinutes);
}

export function activityReminderBody(occurrences: Array<Pick<ReminderOccurrence, "title">>, showActivityNames: boolean): string {
  if (!showActivityNames) return `${occurrences.length} scheduled ${occurrences.length === 1 ? "activity is" : "activities are"} ready.`;
  const visible = occurrences.slice(0, 3).map((occurrence) => occurrence.title);
  const extra = occurrences.length - visible.length;
  return `${visible.join(" · ")}${extra > 0 ? ` · +${extra} more` : ""}`;
}

export function retryDelayMinutes(attemptCount: number): number | null {
  return attemptCount < 3 ? 30 : null;
}

export function deliveryClaimIsAvailable(
  delivery: { status: "PENDING" | "SENT" | "FAILED"; attemptCount: number; nextAttemptAt: Date | null; updatedAt: Date },
  now: Date,
): boolean {
  if (delivery.status === "SENT") return false;
  if (delivery.status === "PENDING") return now.getTime() - delivery.updatedAt.getTime() > 10 * 60_000;
  return delivery.attemptCount < 3 && (!delivery.nextAttemptAt || delivery.nextAttemptAt <= now);
}
