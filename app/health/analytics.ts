import type { ScheduledActivity } from "./scheduling";

export interface HistoricalCompletion {
  activityId: string;
  localDate: string;
  status: "COMPLETED" | "SNOOZED" | "SKIPPED";
}

export interface WeeklyTrend {
  startDate: string;
  endDate: string;
  scheduled: number;
  completed: number;
  skipped: number;
  rate: number | null;
}

export interface LifeRecommendation {
  fingerprint: string;
  activityId: string;
  title: string;
  evidence: string;
  tone: "ENCOURAGEMENT" | "REVIEW";
}

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

export function buildWeeklyTrends(
  activities: ScheduledActivity[],
  completions: HistoricalCompletion[],
  endDate: string,
  weeks = 4,
): WeeklyTrend[] {
  const completionByKey = new Map(completions.map((item) => [`${item.activityId}:${item.localDate}`, item.status]));
  return Array.from({ length: weeks }, (_, index) => {
    const weekEnd = shiftDateKey(endDate, -7 * (weeks - index - 1));
    const weekStart = shiftDateKey(weekEnd, -6);
    let scheduled = 0;
    let completed = 0;
    let skipped = 0;
    for (let offset = 0; offset < 7; offset += 1) {
      const date = shiftDateKey(weekStart, offset);
      for (const activity of activities) {
        if (!activity.daysOfWeek.includes(dayOfWeek(date))) continue;
        scheduled += 1;
        const status = completionByKey.get(`${activity.id}:${date}`);
        if (status === "COMPLETED") completed += 1;
        if (status === "SKIPPED") skipped += 1;
      }
    }
    return { startDate: weekStart, endDate: weekEnd, scheduled, completed, skipped, rate: scheduled ? Math.round((completed / scheduled) * 100) : null };
  });
}

export function buildRecommendations(
  activities: ScheduledActivity[],
  completions: HistoricalCompletion[],
  endDate: string,
): LifeRecommendation[] {
  const startDate = shiftDateKey(endDate, -13);
  const period = `${endDate.slice(0, 7)}`;
  return activities.flatMap<LifeRecommendation>((activity) => {
    let scheduled = 0;
    let completed = 0;
    let skipped = 0;
    for (let offset = 0; offset < 14; offset += 1) {
      const date = shiftDateKey(startDate, offset);
      if (activity.daysOfWeek.includes(dayOfWeek(date))) scheduled += 1;
    }
    for (const item of completions) {
      if (item.activityId !== activity.id || item.localDate < startDate || item.localDate > endDate) continue;
      if (item.status === "COMPLETED") completed += 1;
      if (item.status === "SKIPPED") skipped += 1;
    }
    if (scheduled < 6) return [];
    const rate = Math.round((completed / scheduled) * 100);
    if (completed >= 5 && rate >= 80) return [{
      fingerprint: `steady:${activity.id}:${period}`,
      activityId: activity.id,
      title: `Keep the momentum on ${activity.title}`,
      evidence: `${completed} of ${scheduled} scheduled check-ins were completed in the last 14 days (${rate}%).`,
      tone: "ENCOURAGEMENT" as const,
    }];
    if (rate <= 50 && scheduled - completed >= 3) return [{
      fingerprint: `review:${activity.id}:${period}`,
      activityId: activity.id,
      title: `Review the plan for ${activity.title}`,
      evidence: `${completed} of ${scheduled} scheduled check-ins were completed in the last 14 days (${rate}%); ${skipped} were explicitly skipped.`,
      tone: "REVIEW" as const,
    }];
    return [];
  });
}
