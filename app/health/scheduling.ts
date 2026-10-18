export type ActivityKind = "ROUTINE" | "HABIT";
export type ScheduleType = "SEQUENTIAL" | "FIXED_TIME" | "FLEXIBLE_WINDOW";
export type CompletionStatus = "COMPLETED" | "SNOOZED" | "SKIPPED";

export interface ScheduledActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  position: number;
  scheduleType: ScheduleType;
  fixedTimeMinutes: number | null;
  windowStartMinutes: number | null;
  windowEndMinutes: number | null;
  daysOfWeek: number[];
  importance: "ESSENTIAL" | "OPTIONAL";
  estimatedDurationMinutes: number | null;
}

export interface ActivityCompletionSummary {
  activityId: string;
  status: CompletionStatus;
  snoozedUntil: string | null;
}

export interface LocalDayContext {
  localDate: string;
  dayOfWeek: number;
  minutesSinceMidnight: number;
  nowIso: string;
}

export interface NextActivity {
  activity: ScheduledActivity;
  reason: string;
}

const dayNames: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getLocalDayContext(now: Date, timeZone: string): LocalDayContext {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday");
  const dayOfWeek = dayNames[weekday];
  if (dayOfWeek === undefined) throw new Error(`Unable to determine weekday for ${timeZone}`);
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  return {
    localDate: `${value("year")}-${value("month")}-${value("day")}`,
    dayOfWeek,
    minutesSinceMidnight: hour * 60 + minute,
    nowIso: now.toISOString(),
  };
}

export function activitiesForDay<T extends ScheduledActivity>(activities: T[], dayOfWeek: number): T[] {
  return activities.filter((activity) => activity.daysOfWeek.includes(dayOfWeek));
}

function rankActivity(activity: ScheduledActivity, currentMinutes: number): [number, number, number] {
  const importance = activity.importance === "ESSENTIAL" ? 0 : 1;
  if (activity.scheduleType === "FIXED_TIME" && activity.fixedTimeMinutes !== null) {
    const delta = activity.fixedTimeMinutes - currentMinutes;
    if (delta <= 0) return [0, activity.fixedTimeMinutes, importance];
    if (delta <= 30) return [1, activity.fixedTimeMinutes, importance];
    return [5, activity.fixedTimeMinutes, importance];
  }
  if (activity.scheduleType === "FLEXIBLE_WINDOW" && activity.windowStartMinutes !== null && activity.windowEndMinutes !== null) {
    if (currentMinutes >= activity.windowStartMinutes && currentMinutes <= activity.windowEndMinutes) return [2, importance, activity.position];
    if (currentMinutes > activity.windowEndMinutes) return [3, importance, activity.position];
    return [6, activity.windowStartMinutes, importance];
  }
  return activity.kind === "ROUTINE" ? [4, activity.position, importance] : [7, importance, activity.position];
}

function reasonFor(activity: ScheduledActivity, currentMinutes: number): string {
  if (activity.scheduleType === "FIXED_TIME" && activity.fixedTimeMinutes !== null) {
    const delta = activity.fixedTimeMinutes - currentMinutes;
    if (delta < 0) return "Fixed-time activity is overdue";
    if (delta <= 30) return `Fixed-time activity starts in ${delta} minutes`;
    return "Next fixed-time activity";
  }
  if (activity.scheduleType === "FLEXIBLE_WINDOW" && activity.windowStartMinutes !== null && activity.windowEndMinutes !== null) {
    if (currentMinutes > activity.windowEndMinutes) return "Preferred window has passed";
    if (currentMinutes >= activity.windowStartMinutes) return "Inside its preferred window";
    return "Upcoming flexible activity";
  }
  return activity.kind === "ROUTINE" ? "Next in your routine" : "Habit scheduled for today";
}

export function selectNextActivity(
  activities: ScheduledActivity[],
  completions: ActivityCompletionSummary[],
  context: LocalDayContext,
): NextActivity | null {
  const completionByActivity = new Map(completions.map((completion) => [completion.activityId, completion]));
  const now = new Date(context.nowIso).getTime();
  const candidates = activitiesForDay(activities, context.dayOfWeek).filter((activity) => {
    const completion = completionByActivity.get(activity.id);
    if (!completion) return true;
    if (completion.status === "COMPLETED" || completion.status === "SKIPPED") return false;
    return !completion.snoozedUntil || new Date(completion.snoozedUntil).getTime() <= now;
  });
  const activity = candidates.toSorted((left, right) => {
    const leftRank = rankActivity(left, context.minutesSinceMidnight);
    const rightRank = rankActivity(right, context.minutesSinceMidnight);
    for (let index = 0; index < leftRank.length; index += 1) {
      const difference = (leftRank[index] ?? 0) - (rightRank[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return left.title.localeCompare(right.title);
  })[0];
  return activity ? { activity, reason: reasonFor(activity, context.minutesSinceMidnight) } : null;
}

export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}
