import "server-only";

import { prisma } from "@/lib/database";
import { exerciseProgress, buildWellnessSummary } from "./wellness";
import { shiftDateKey } from "./analytics";

export interface WellnessDashboardData {
  summary: { workoutCount: number; workoutMinutes: number; creativeCount: number; creativeMinutes: number };
  activities: Array<{ id: string; title: string; kind: "ROUTINE" | "HABIT" }>;
  workoutPlans: Array<{
    id: string; name: string; description: string | null; estimatedDurationMinutes: number | null;
    linkedActivity: { id: string; title: string } | null;
    exercises: Array<{ id: string; name: string; targetSets: number | null; targetReps: number | null; progress: Array<{ localDate: string; sets: number | null; reps: number | null }> }>;
    sessions: Array<{ id: string; localDate: string; status: "COMPLETED" | "SKIPPED"; durationMinutes: number | null; note: string | null }>;
  }>;
  creativeProjects: Array<{
    id: string; name: string; description: string | null; status: "PLANNED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";
    linkedActivity: { id: string; title: string } | null; sessionCount: number; totalMinutes: number;
  }>;
  creativeSessions: Array<{ id: string; localDate: string; activityType: string; durationMinutes: number | null; note: string | null; projectName: string | null }>;
}

export async function getWellnessDashboardData(userId: string, localDate: string): Promise<WellnessDashboardData> {
  const weekStart = shiftDateKey(localDate, -6);
  const [plans, projects, projectStats, creativeSessions, weeklyWorkoutSessions, weeklyCreativeSessions, activities] = await Promise.all([
    prisma.lifeWorkoutPlan.findMany({
      where: { userId, active: true },
      orderBy: { updatedAt: "desc" },
      include: {
        linkedActivity: { select: { id: true, title: true } },
        exercises: { orderBy: { position: "asc" } },
        sessions: { orderBy: [{ localDate: "desc" }, { createdAt: "desc" }], take: 30, include: { results: true } },
      },
    }),
    prisma.lifeCreativeProject.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: { linkedActivity: { select: { id: true, title: true } } },
    }),
    prisma.lifeCreativeSession.groupBy({ by: ["projectId"], where: { userId, projectId: { not: null } }, _count: { _all: true }, _sum: { durationMinutes: true } }),
    prisma.lifeCreativeSession.findMany({
      where: { userId },
      orderBy: [{ localDate: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { project: { select: { name: true } } },
    }),
    prisma.lifeWorkoutSession.findMany({ where: { userId, localDate: { gte: weekStart, lte: localDate } }, select: { localDate: true, status: true, durationMinutes: true } }),
    prisma.lifeCreativeSession.findMany({ where: { userId, localDate: { gte: weekStart, lte: localDate } }, select: { localDate: true, durationMinutes: true } }),
    prisma.lifeActivity.findMany({ where: { userId, active: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, kind: true } }),
  ]);
  const statsByProject = new Map(projectStats.map((stats) => [stats.projectId, stats]));
  return {
    summary: buildWellnessSummary(weeklyWorkoutSessions, weeklyCreativeSessions, localDate),
    activities,
    workoutPlans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      estimatedDurationMinutes: plan.estimatedDurationMinutes,
      linkedActivity: plan.linkedActivity,
      exercises: plan.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        progress: exerciseProgress(plan.sessions, exercise.id).slice(0, 3),
      })),
      sessions: plan.sessions.map((session) => ({ id: session.id, localDate: session.localDate, status: session.status, durationMinutes: session.durationMinutes, note: session.note })),
    })),
    creativeProjects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      linkedActivity: project.linkedActivity,
      sessionCount: statsByProject.get(project.id)?._count._all ?? 0,
      totalMinutes: statsByProject.get(project.id)?._sum.durationMinutes ?? 0,
    })),
    creativeSessions: creativeSessions.map((session) => ({
      id: session.id,
      localDate: session.localDate,
      activityType: session.activityType,
      durationMinutes: session.durationMinutes,
      note: session.note,
      projectName: session.project?.name ?? session.projectNameSnapshot,
    })),
  };
}
