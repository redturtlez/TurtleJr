import type { ScheduledActivity } from "./scheduling";

export interface HistoricalCompletion {
  activityId: string;
  localDate: string;
  status: "COMPLETED" | "SNOOZED" | "SKIPPED";
}

export interface AnalyticsActivity extends ScheduledActivity {
  activeFromDate?: string;
}

export interface WeeklyTrend {
  startDate: string;
  endDate: string;
  scheduled: number;
  completed: number;
  skipped: number;
  rate: number | null;
}

export interface HabitPattern {
  key: string;
  activityId: string;
  kind: "IMPROVING" | "DECLINING" | "WEEKDAY_FRICTION";
  title: string;
  evidence: string;
  strength: number;
}

export interface LifeRecommendation {
  fingerprint: string;
  activityId: string;
  title: string;
  evidence: string;
  tone: "ENCOURAGEMENT" | "REVIEW";
}

interface CompletionStats {
  scheduled: number;
  completed: number;
  skipped: number;
  rate: number;
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function dateFromKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function shiftDateKey(value: string, days: number): string {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayOfWeek(value: string): number {
  return dateFromKey(value).getUTCDay();
}

function completionMap(completions: HistoricalCompletion[]): Map<string, HistoricalCompletion["status"]> {
  return new Map(completions.map((item) => [`${item.activityId}:${item.localDate}`, item.status]));
}

function activityStats(activity: AnalyticsActivity, byKey: Map<string, HistoricalCompletion["status"]>, startDate: string, endDate: string): CompletionStats {
  let scheduled = 0;
  let completed = 0;
  let skipped = 0;
  for (let date = startDate; date <= endDate; date = shiftDateKey(date, 1)) {
    if (activity.activeFromDate && date < activity.activeFromDate) continue;
    if (!activity.daysOfWeek.includes(dayOfWeek(date))) continue;
    scheduled += 1;
    const status = byKey.get(`${activity.id}:${date}`);
    if (status === "COMPLETED") completed += 1;
    if (status === "SKIPPED") skipped += 1;
  }
  return { scheduled, completed, skipped, rate: scheduled ? Math.round((completed / scheduled) * 100) : 0 };
}

export function buildWeeklyTrends(
  activities: AnalyticsActivity[],
  completions: HistoricalCompletion[],
  endDate: string,
  weeks = 4,
): WeeklyTrend[] {
  const byKey = completionMap(completions);
  return Array.from({ length: weeks }, (_, index) => {
    const weekEnd = shiftDateKey(endDate, -7 * (weeks - index - 1));
    const weekStart = shiftDateKey(weekEnd, -6);
    const totals = activities.reduce((sum, activity) => {
      const stats = activityStats(activity, byKey, weekStart, weekEnd);
      return { scheduled: sum.scheduled + stats.scheduled, completed: sum.completed + stats.completed, skipped: sum.skipped + stats.skipped };
    }, { scheduled: 0, completed: 0, skipped: 0 });
    return { startDate: weekStart, endDate: weekEnd, ...totals, rate: totals.scheduled ? Math.round((totals.completed / totals.scheduled) * 100) : null };
  });
}

export function buildHabitPatterns(
  activities: AnalyticsActivity[],
  completions: HistoricalCompletion[],
  endDate: string,
): HabitPattern[] {
  const byKey = completionMap(completions);
  const currentStart = shiftDateKey(endDate, -13);
  const previousEnd = shiftDateKey(currentStart, -1);
  const previousStart = shiftDateKey(previousEnd, -13);
  const weekdayStart = shiftDateKey(endDate, -55);
  const patterns: HabitPattern[] = [];

  for (const activity of activities) {
    const current = activityStats(activity, byKey, currentStart, endDate);
    const previous = activityStats(activity, byKey, previousStart, previousEnd);
    if (current.scheduled >= 4 && previous.scheduled >= 4) {
      const delta = current.rate - previous.rate;
      if (delta >= 20 && current.rate >= 60) patterns.push({
        key: `improving:${activity.id}`,
        activityId: activity.id,
        kind: "IMPROVING",
        title: `${activity.title} is becoming more consistent`,
        evidence: `Completion rose from ${previous.rate}% (${previous.completed} of ${previous.scheduled}) to ${current.rate}% (${current.completed} of ${current.scheduled}) across consecutive 14-day periods.`,
        strength: delta,
      });
      if (delta <= -20 && previous.rate >= 60) patterns.push({
        key: `declining:${activity.id}`,
        activityId: activity.id,
        kind: "DECLINING",
        title: `${activity.title} has lost some consistency`,
        evidence: `Completion moved from ${previous.rate}% (${previous.completed} of ${previous.scheduled}) to ${current.rate}% (${current.completed} of ${current.scheduled}) across consecutive 14-day periods.`,
        strength: Math.abs(delta),
      });
    }

    const weekdayStats = activity.daysOfWeek.map((weekday) => {
      let scheduled = 0;
      let completed = 0;
      for (let date = weekdayStart; date <= endDate; date = shiftDateKey(date, 1)) {
        if (activity.activeFromDate && date < activity.activeFromDate) continue;
        if (dayOfWeek(date) !== weekday) continue;
        scheduled += 1;
        if (byKey.get(`${activity.id}:${date}`) === "COMPLETED") completed += 1;
      }
      return { weekday, scheduled, completed, rate: scheduled ? Math.round((completed / scheduled) * 100) : 0 };
    }).filter((item) => item.scheduled >= 4);
    if (weekdayStats.length < 2) continue;
    const ordered = weekdayStats.toSorted((left, right) => left.rate - right.rate || left.weekday - right.weekday);
    const weakest = ordered[0]!;
    const strongest = ordered.at(-1)!;
    const gap = strongest.rate - weakest.rate;
    if (weakest.rate <= 50 && gap >= 30) patterns.push({
      key: `weekday:${activity.id}:${weakest.weekday}`,
      activityId: activity.id,
      kind: "WEEKDAY_FRICTION",
      title: `${weekdayNames[weakest.weekday]} is the harder day for ${activity.title}`,
      evidence: `${weakest.completed} of ${weakest.scheduled} ${weekdayNames[weakest.weekday]} check-ins were completed (${weakest.rate}%), compared with ${strongest.rate}% on ${weekdayNames[strongest.weekday]}.`,
      strength: gap,
    });
  }

  const kindPriority: Record<HabitPattern["kind"], number> = { DECLINING: 3, WEEKDAY_FRICTION: 2, IMPROVING: 1 };
  return patterns.toSorted((left, right) => kindPriority[right.kind] - kindPriority[left.kind] || right.strength - left.strength);
}

export function buildRecommendations(
  activities: AnalyticsActivity[],
  completions: HistoricalCompletion[],
  endDate: string,
  patterns = buildHabitPatterns(activities, completions, endDate),
): LifeRecommendation[] {
  const byKey = completionMap(completions);
  const startDate = shiftDateKey(endDate, -13);
  const period = endDate.slice(0, 7);
  const ranked = activities.flatMap<{ priority: number; recommendation: LifeRecommendation }>((activity) => {
    const stats = activityStats(activity, byKey, startDate, endDate);
    if (stats.scheduled < 6) return [];
    const pattern = patterns.find((item) => item.activityId === activity.id);
    if (pattern?.kind === "DECLINING") return [{
      priority: 100 + pattern.strength,
      recommendation: { fingerprint: `decline:${activity.id}:${period}`, activityId: activity.id, title: `Review the recent change for ${activity.title}`, evidence: pattern.evidence, tone: "REVIEW" as const },
    }];
    if (stats.rate <= 50 && stats.scheduled - stats.completed >= 3) return [{
      priority: 80 + (50 - stats.rate),
      recommendation: { fingerprint: `review:${activity.id}:${period}`, activityId: activity.id, title: `Review the plan for ${activity.title}`, evidence: `${stats.completed} of ${stats.scheduled} scheduled check-ins were completed in the last 14 days (${stats.rate}%); ${stats.skipped} were explicitly skipped.`, tone: "REVIEW" as const },
    }];
    if (pattern?.kind === "WEEKDAY_FRICTION") return [{
      priority: 60 + pattern.strength,
      recommendation: { fingerprint: `weekday:${activity.id}:${period}`, activityId: activity.id, title: "Consider a lighter version on the harder day", evidence: pattern.evidence, tone: "REVIEW" as const },
    }];
    if (pattern?.kind === "IMPROVING") return [{
      priority: 40 + pattern.strength,
      recommendation: { fingerprint: `improving:${activity.id}:${period}`, activityId: activity.id, title: `Momentum is building for ${activity.title}`, evidence: pattern.evidence, tone: "ENCOURAGEMENT" as const },
    }];
    if (stats.completed >= 5 && stats.rate >= 80) return [{
      priority: 20 + stats.rate,
      recommendation: { fingerprint: `steady:${activity.id}:${period}`, activityId: activity.id, title: `Keep the momentum on ${activity.title}`, evidence: `${stats.completed} of ${stats.scheduled} scheduled check-ins were completed in the last 14 days (${stats.rate}%).`, tone: "ENCOURAGEMENT" as const },
    }];
    return [];
  });
  return ranked.toSorted((left, right) => right.priority - left.priority).slice(0, 3).map((item) => item.recommendation);
}
