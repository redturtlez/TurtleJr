import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database";
import { getLocalDayContext, type ActivityCompletionSummary, type ScheduledActivity } from "./scheduling";
import { buildHabitPatterns, buildRecommendations, buildWeeklyTrends, shiftDateKey, type HabitPattern, type LifeRecommendation, type WeeklyTrend } from "./analytics";

export interface DashboardActivity extends ScheduledActivity {
  description: string | null;
  minimumDurationMinutes: number | null;
  preferredDurationMinutes: number | null;
  reminderEnabled: boolean;
}

export interface LifeDashboardData {
  profile: { timeZone: string };
  routine: { id: string; name: string };
  activities: DashboardActivity[];
  completions: ActivityCompletionSummary[];
  context: ReturnType<typeof getLocalDayContext>;
  goals: Array<{
    id: string; title: string; description: string | null; targetValue: number | null; targetUnit: string | null;
    targetDate: string | null; status: "ACTIVE" | "PAUSED" | "COMPLETED"; activityIds: string[];
    progress: Array<{ id: string; localDate: string; value: number | null; note: string | null }>;
  }>;
  trends: WeeklyTrend[];
  patterns: HabitPattern[];
  recommendations: LifeRecommendation[];
}

export type TodayDashboardData = Pick<LifeDashboardData, "profile" | "activities" | "completions" | "context">;
export type ConfigureDashboardData = Pick<LifeDashboardData, "profile" | "routine" | "activities">;
export type GoalsDashboardData = Pick<LifeDashboardData, "activities" | "context" | "goals">;
export type InsightsDashboardData = Pick<LifeDashboardData, "trends" | "patterns" | "recommendations">;

type LifeContextClient = Pick<Prisma.TransactionClient, "lifeProfile">;
type InsightsClient = Pick<Prisma.TransactionClient, "lifeActivity" | "lifeCompletion" | "lifeRecommendationFeedback">;

export async function getLifeContext(userId: string, now = new Date(), database: LifeContextClient = prisma): Promise<Pick<LifeDashboardData, "profile" | "context">> {
  const profile = await database.lifeProfile.findUnique({ where: { userId }, select: { timeZone: true } })
    ?? { timeZone: "America/New_York" };
  return { profile, context: getLocalDayContext(now, profile.timeZone) };
}

export async function getTodayDashboardData(userId: string, now = new Date()): Promise<TodayDashboardData> {
  const { profile, context } = await getLifeContext(userId, now);
  const [activities, completions] = await Promise.all([
    prisma.lifeActivity.findMany({
      where: { userId, active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, kind: true, title: true, description: true, position: true, estimatedDurationMinutes: true,
        minimumDurationMinutes: true, preferredDurationMinutes: true, scheduleType: true, fixedTimeMinutes: true,
        windowStartMinutes: true, windowEndMinutes: true, daysOfWeek: true, importance: true, reminderEnabled: true,
      },
    }),
    prisma.lifeCompletion.findMany({
      where: { userId, localDate: context.localDate },
      select: { activityId: true, status: true, snoozedUntil: true },
    }),
  ]);
  return {
    profile,
    context,
    activities,
    completions: completions.map((completion) => ({
      activityId: completion.activityId,
      status: completion.status,
      snoozedUntil: completion.snoozedUntil?.toISOString() ?? null,
    })),
  };
}

export async function getConfigureDashboardData(userId: string): Promise<ConfigureDashboardData> {
  const [{ profile }, routine, activities] = await Promise.all([
    getLifeContext(userId),
    prisma.lifeRoutine.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.lifeActivity.findMany({
      where: { userId, active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, kind: true, title: true, description: true, position: true, estimatedDurationMinutes: true,
        minimumDurationMinutes: true, preferredDurationMinutes: true, scheduleType: true, fixedTimeMinutes: true,
        windowStartMinutes: true, windowEndMinutes: true, daysOfWeek: true, importance: true, reminderEnabled: true,
      },
    }),
  ]);
  return { profile, routine: routine ?? { id: "", name: "Daily routine" }, activities };
}

export async function getGoalsDashboardData(userId: string, now = new Date()): Promise<GoalsDashboardData> {
  const { context } = await getLifeContext(userId, now);
  const [activities, goals] = await Promise.all([
    prisma.lifeActivity.findMany({
      where: { userId, active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, kind: true, title: true, description: true, position: true, estimatedDurationMinutes: true,
        minimumDurationMinutes: true, preferredDurationMinutes: true, scheduleType: true, fixedTimeMinutes: true,
        windowStartMinutes: true, windowEndMinutes: true, daysOfWeek: true, importance: true, reminderEnabled: true,
      },
    }),
    prisma.lifeGoal.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true, title: true, description: true, targetValue: true, targetUnit: true, targetDate: true, status: true,
        activityLinks: { select: { activityId: true } },
        progress: { orderBy: [{ localDate: "desc" }, { createdAt: "desc" }], take: 20, select: { id: true, localDate: true, value: true, note: true } },
      },
    }),
  ]);
  return {
    context,
    activities,
    goals: goals.map((goal) => ({
      id: goal.id, title: goal.title, description: goal.description, targetValue: goal.targetValue, targetUnit: goal.targetUnit,
      targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null, status: goal.status,
      activityIds: goal.activityLinks.map((link) => link.activityId), progress: goal.progress,
    })),
  };
}

export async function getInsightsDashboardData(userId: string, timeZone: string, localDate: string, now = new Date(), database: InsightsClient = prisma): Promise<InsightsDashboardData> {
  const historyStart = shiftDateKey(localDate, -55);
  const [activities, history, feedback] = await Promise.all([
    database.lifeActivity.findMany({
      where: { userId, active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, kind: true, title: true, position: true, estimatedDurationMinutes: true, scheduleType: true,
        fixedTimeMinutes: true, windowStartMinutes: true, windowEndMinutes: true, daysOfWeek: true,
        importance: true, createdAt: true,
      },
    }),
    database.lifeCompletion.findMany({
      where: { userId, localDate: { gte: historyStart, lte: localDate } },
      select: { activityId: true, localDate: true, status: true },
    }),
    database.lifeRecommendationFeedback.findMany({
      where: { userId },
      select: { fingerprint: true, status: true, snoozedUntil: true },
    }),
  ]);
  const analyticsActivities = activities.map((activity) => ({
    ...activity,
    activeFromDate: getLocalDayContext(activity.createdAt, timeZone).localDate,
  }));
  const trends = buildWeeklyTrends(analyticsActivities, history, localDate);
  const allPatterns = buildHabitPatterns(analyticsActivities, history, localDate);
  const feedbackByFingerprint = new Map(feedback.map((item) => [item.fingerprint, item]));
  const recommendations = buildRecommendations(analyticsActivities, history, localDate, allPatterns).filter((item) => {
    const response = feedbackByFingerprint.get(item.fingerprint);
    if (!response) return true;
    if (response.status === "SNOOZED") return !response.snoozedUntil || response.snoozedUntil <= now;
    return false;
  });
  return { trends, patterns: allPatterns.slice(0, 4), recommendations };
}

export async function getLifeDashboardData(userId: string, now = new Date()): Promise<LifeDashboardData> {
  try {
    const { profile, context } = await getLifeContext(userId, now);
    const routine = await prisma.lifeRoutine.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }) ?? { id: "", name: "Daily routine" };
    const historyStart = shiftDateKey(context.localDate, -55);
    const [activities, completions, history, goals, feedback] = await Promise.all([
      prisma.lifeActivity.findMany({
        where: { userId, active: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kind: true,
          title: true,
          description: true,
          position: true,
          estimatedDurationMinutes: true,
          minimumDurationMinutes: true,
          preferredDurationMinutes: true,
          scheduleType: true,
          fixedTimeMinutes: true,
          windowStartMinutes: true,
          windowEndMinutes: true,
          daysOfWeek: true,
          importance: true,
          reminderEnabled: true,
          createdAt: true,
        },
      }),
      prisma.lifeCompletion.findMany({
        where: { userId, localDate: context.localDate },
        select: { activityId: true, status: true, snoozedUntil: true },
      }),
      prisma.lifeCompletion.findMany({
        where: { userId, localDate: { gte: historyStart, lte: context.localDate } },
        select: { activityId: true, localDate: true, status: true },
      }),
      prisma.lifeGoal.findMany({
        where: { userId },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true, title: true, description: true, targetValue: true, targetUnit: true, targetDate: true, status: true,
          activityLinks: { select: { activityId: true } },
          progress: { orderBy: [{ localDate: "desc" }, { createdAt: "desc" }], take: 20, select: { id: true, localDate: true, value: true, note: true } },
        },
      }),
      prisma.lifeRecommendationFeedback.findMany({ where: { userId }, select: { fingerprint: true, status: true, snoozedUntil: true } }),
    ]);
    const analyticsActivities = activities.map((activity) => ({ ...activity, activeFromDate: getLocalDayContext(activity.createdAt, profile.timeZone).localDate }));
    const trends = buildWeeklyTrends(analyticsActivities, history, context.localDate);
    const allPatterns = buildHabitPatterns(analyticsActivities, history, context.localDate);
    const patterns = allPatterns.slice(0, 4);
    const feedbackByFingerprint = new Map(feedback.map((item) => [item.fingerprint, item]));
    const recommendations = buildRecommendations(analyticsActivities, history, context.localDate, allPatterns).filter((item) => {
      const response = feedbackByFingerprint.get(item.fingerprint);
      if (!response) return true;
      if (response.status === "SNOOZED") return !response.snoozedUntil || response.snoozedUntil <= now;
      return false;
    });
    return {
      profile,
      routine,
      activities: activities.map(({ createdAt: _createdAt, ...activity }) => activity),
      completions: completions.map((completion) => ({
        activityId: completion.activityId,
        status: completion.status,
        snoozedUntil: completion.snoozedUntil?.toISOString() ?? null,
      })),
      context,
      goals: goals.map((goal) => ({
        id: goal.id, title: goal.title, description: goal.description, targetValue: goal.targetValue, targetUnit: goal.targetUnit,
        targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null, status: goal.status,
        activityIds: goal.activityLinks.map((link) => link.activityId), progress: goal.progress,
      })),
      trends,
      patterns,
      recommendations,
    };
  } catch {
    throw new Error("Could not load the Life Dashboard");
  }
}
