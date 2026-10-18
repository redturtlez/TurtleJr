"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/database";
import { buildRecommendations, shiftDateKey } from "./analytics";
import { getLocalDayContext } from "./scheduling";
import { activitySchema, goalProgressSchema, goalSchema, recommendationFeedbackSchema, statusSchema } from "./validation";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to update the Life Dashboard");
  return userId;
}

function refreshHealth(): void {
  revalidatePath("/health");
}

export async function createActivity(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid activity");
  try {
    const routine = parsed.data.kind === "ROUTINE"
      ? await prisma.lifeRoutine.findFirst({ where: { userId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true } })
      : null;
    if (parsed.data.kind === "ROUTINE" && !routine) throw new Error("No active routine exists");
    const count = await prisma.lifeActivity.count({ where: { userId, kind: parsed.data.kind, active: true } });
    await prisma.lifeActivity.create({
      data: {
        ...parsed.data,
        userId,
        description: parsed.data.description || null,
        daysOfWeek: [...new Set(parsed.data.daysOfWeek)].toSorted(),
        routineId: routine?.id ?? null,
        position: count,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "No active routine exists") throw error;
    throw new Error("Could not create the activity");
  }
  refreshHealth();
}

export async function updateActivity(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = activitySchema.and(z.object({ id: z.string().cuid() })).safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid activity");
  try {
    const existing = await prisma.lifeActivity.findFirst({ where: { id: parsed.data.id, userId }, select: { id: true } });
    if (!existing) throw new Error("Activity not found");
    const routine = parsed.data.kind === "ROUTINE"
      ? await prisma.lifeRoutine.findFirst({ where: { userId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true } })
      : null;
    if (parsed.data.kind === "ROUTINE" && !routine) throw new Error("No active routine exists");
    const { id, ...activity } = parsed.data;
    await prisma.lifeActivity.updateMany({
      where: { id, userId },
      data: {
        ...activity,
        description: activity.description || null,
        daysOfWeek: [...new Set(activity.daysOfWeek)].toSorted(),
        routineId: routine?.id ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Activity not found" || error.message === "No active routine exists")) throw error;
    throw new Error("Could not update the activity");
  }
  refreshHealth();
}

export async function setActivityStatus(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid completion");
  try {
    const activity = await prisma.lifeActivity.findFirst({
      where: { id: parsed.data.activityId, userId, active: true },
      select: { id: true, title: true },
    });
    if (!activity) throw new Error("Activity not found");
    const snoozedUntil = parsed.data.status === "SNOOZED" ? new Date(Date.now() + 30 * 60 * 1000) : null;
    await prisma.lifeCompletion.upsert({
      where: { activityId_localDate: { activityId: activity.id, localDate: parsed.data.localDate } },
      update: { status: parsed.data.status, durationMinutes: parsed.data.durationMinutes, snoozedUntil, titleSnapshot: activity.title },
      create: {
        userId,
        activityId: activity.id,
        localDate: parsed.data.localDate,
        status: parsed.data.status,
        durationMinutes: parsed.data.durationMinutes,
        snoozedUntil,
        titleSnapshot: activity.title,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") throw error;
    throw new Error("Could not update the activity");
  }
  refreshHealth();
}

export async function clearActivityStatus(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = statusSchema.pick({ activityId: true, localDate: true }).safeParse(input);
  if (!parsed.success) throw new Error("Invalid completion");
  try {
    await prisma.lifeCompletion.deleteMany({ where: { userId, activityId: parsed.data.activityId, localDate: parsed.data.localDate } });
  } catch {
    throw new Error("Could not reset the activity");
  }
  refreshHealth();
}

export async function archiveActivity(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = z.string().cuid().safeParse(input);
  if (!parsed.success) throw new Error("Invalid activity");
  try {
    await prisma.lifeActivity.updateMany({ where: { id: parsed.data, userId }, data: { active: false } });
  } catch {
    throw new Error("Could not archive the activity");
  }
  refreshHealth();
}

export async function moveActivity(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = z.object({ id: z.string().cuid(), direction: z.enum(["UP", "DOWN"]) }).safeParse(input);
  if (!parsed.success) throw new Error("Invalid activity order");
  try {
    const current = await prisma.lifeActivity.findFirst({
      where: { id: parsed.data.id, userId, active: true },
      select: { id: true, kind: true, routineId: true, position: true },
    });
    if (!current) throw new Error("Activity not found");
    const siblings = await prisma.lifeActivity.findMany({
      where: { userId, active: true, kind: current.kind, routineId: current.routineId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, position: true },
    });
    const index = siblings.findIndex((activity) => activity.id === current.id);
    const target = siblings[index + (parsed.data.direction === "UP" ? -1 : 1)];
    if (!target) return;
    await prisma.$transaction([
      prisma.lifeActivity.updateMany({ where: { id: current.id, userId }, data: { position: target.position } }),
      prisma.lifeActivity.updateMany({ where: { id: target.id, userId }, data: { position: current.position } }),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "Activity not found") throw error;
    throw new Error("Could not reorder the activity");
  }
  refreshHealth();
}

export async function updateTimeZone(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = z.string().trim().min(1).max(100).safeParse(input);
  if (!parsed.success) throw new Error("Invalid time zone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed.data }).format();
  } catch {
    throw new Error("Enter a valid IANA time zone");
  }
  try {
    await prisma.lifeProfile.upsert({ where: { userId }, update: { timeZone: parsed.data }, create: { userId, timeZone: parsed.data } });
  } catch {
    throw new Error("Could not update the time zone");
  }
  refreshHealth();
}

async function validateGoalHabits(userId: string, activityIds: string[]): Promise<void> {
  const count = await prisma.lifeActivity.count({ where: { userId, id: { in: activityIds }, kind: "HABIT", active: true } });
  if (count !== activityIds.length) throw new Error("One or more selected habits are unavailable");
}

export async function createGoal(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid goal");
  try {
    await validateGoalHabits(userId, parsed.data.activityIds);
    const { activityIds, targetDate, ...goal } = parsed.data;
    await prisma.lifeGoal.create({ data: {
      ...goal, userId, description: goal.description || null, targetUnit: goal.targetUnit || null,
      targetDate: targetDate ? new Date(`${targetDate}T12:00:00.000Z`) : null,
      activityLinks: { create: activityIds.map((activityId) => ({ userId, activityId })) },
    } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("selected habits")) throw error;
    throw new Error("Could not create the goal");
  }
  refreshHealth();
}

export async function updateGoal(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = goalSchema.and(z.object({ id: z.string().cuid() })).safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid goal");
  try {
    const existing = await prisma.lifeGoal.findFirst({ where: { id: parsed.data.id, userId }, select: { id: true } });
    if (!existing) throw new Error("Goal not found");
    await validateGoalHabits(userId, parsed.data.activityIds);
    const { id, activityIds, targetDate, ...goal } = parsed.data;
    await prisma.$transaction([
      prisma.lifeActivityGoal.deleteMany({ where: { goalId: id, userId } }),
      prisma.lifeGoal.updateMany({ where: { id, userId }, data: { ...goal, description: goal.description || null, targetUnit: goal.targetUnit || null, targetDate: targetDate ? new Date(`${targetDate}T12:00:00.000Z`) : null } }),
      ...activityIds.map((activityId) => prisma.lifeActivityGoal.create({ data: { userId, goalId: id, activityId } })),
    ]);
  } catch (error) {
    if (error instanceof Error && (error.message === "Goal not found" || error.message.includes("selected habits"))) throw error;
    throw new Error("Could not update the goal");
  }
  refreshHealth();
}

export async function addGoalProgress(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = goalProgressSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid progress update");
  try {
    const goal = await prisma.lifeGoal.findFirst({ where: { id: parsed.data.goalId, userId }, select: { id: true } });
    if (!goal) throw new Error("Goal not found");
    await prisma.lifeGoalProgress.create({ data: { ...parsed.data, userId, note: parsed.data.note || null } });
  } catch (error) {
    if (error instanceof Error && error.message === "Goal not found") throw error;
    throw new Error("Could not add the progress update");
  }
  refreshHealth();
}

async function currentRecommendationFingerprints(userId: string): Promise<Set<string>> {
  const profile = await prisma.lifeProfile.findUnique({ where: { userId }, select: { timeZone: true } });
  if (!profile) return new Set();
  const localDate = getLocalDayContext(new Date(), profile.timeZone).localDate;
  const start = shiftDateKey(localDate, -13);
  const [activities, history] = await Promise.all([
    prisma.lifeActivity.findMany({ where: { userId, active: true }, orderBy: { position: "asc" } }),
    prisma.lifeCompletion.findMany({ where: { userId, localDate: { gte: start, lte: localDate } }, select: { activityId: true, localDate: true, status: true } }),
  ]);
  return new Set(buildRecommendations(activities, history, localDate).map((item) => item.fingerprint));
}

export async function respondToRecommendation(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = recommendationFeedbackSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid recommendation response");
  try {
    if (!(await currentRecommendationFingerprints(userId)).has(parsed.data.fingerprint)) throw new Error("Recommendation is no longer available");
    await prisma.lifeRecommendationFeedback.upsert({
      where: { userId_fingerprint: { userId, fingerprint: parsed.data.fingerprint } },
      update: { status: parsed.data.status, snoozedUntil: parsed.data.status === "SNOOZED" ? new Date(Date.now() + 7 * 86_400_000) : null },
      create: { userId, fingerprint: parsed.data.fingerprint, status: parsed.data.status, snoozedUntil: parsed.data.status === "SNOOZED" ? new Date(Date.now() + 7 * 86_400_000) : null },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Recommendation is no longer available") throw error;
    throw new Error("Could not save the recommendation response");
  }
  refreshHealth();
}
