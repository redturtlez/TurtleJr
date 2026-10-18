import { auth } from "@clerk/nextjs/server";
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

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to view the Life Dashboard");
  return userId;
}

export async function getLifeDashboardData(now = new Date()): Promise<LifeDashboardData> {
  const userId = await requireUserId();
  try {
    const profile = await prisma.lifeProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { timeZone: true },
    });
    let routine = await prisma.lifeRoutine.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    routine ??= await prisma.lifeRoutine.create({
      data: { userId, name: "Daily routine" },
      select: { id: true, name: true },
    });
    const context = getLocalDayContext(now, profile.timeZone);
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
