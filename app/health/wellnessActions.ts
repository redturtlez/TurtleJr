"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { creativeProjectSchema, creativeProjectStatusSchema, creativeSessionSchema, workoutPlanSchema, workoutSessionSchema } from "./validation";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to update activity tracking");
  return userId;
}

async function validateActivity(userId: string, activityId: string | null): Promise<void> {
  if (!activityId) return;
  const activity = await prisma.lifeActivity.findFirst({ where: { id: activityId, userId, active: true }, select: { id: true } });
  if (!activity) throw new Error("The linked routine activity is unavailable");
}

const refresh = (): void => revalidatePath("/health");

export async function createWorkoutPlan(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = workoutPlanSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid workout plan");
  await validateActivity(userId, parsed.data.activityId);
  await prisma.lifeWorkoutPlan.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
      activityId: parsed.data.activityId,
      exercises: { create: parsed.data.exercises.map((exercise, position) => ({ ...exercise, position })) },
    },
  });
  refresh();
}

export async function logWorkoutSession(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = workoutSessionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid workout session");
  const plan = await prisma.lifeWorkoutPlan.findFirst({
    where: { id: parsed.data.planId, userId, active: true },
    include: { exercises: { orderBy: { position: "asc" } }, linkedActivity: { select: { id: true, title: true, active: true } } },
  });
  if (!plan) throw new Error("Workout plan not found");
  const resultIds = parsed.data.results.map((result) => result.exerciseId);
  if (new Set(resultIds).size !== resultIds.length) throw new Error("Record each exercise once per session");
  const exercisesById = new Map(plan.exercises.map((exercise) => [exercise.id, exercise]));
  if (resultIds.some((id) => !exercisesById.has(id))) throw new Error("One or more exercises are unavailable");
  const results = parsed.data.status === "COMPLETED" ? parsed.data.results : [];
  await prisma.$transaction(async (transaction) => {
    await transaction.lifeWorkoutSession.create({
      data: {
        userId,
        planId: plan.id,
        localDate: parsed.data.localDate,
        status: parsed.data.status,
        durationMinutes: parsed.data.durationMinutes,
        note: parsed.data.note || null,
        planNameSnapshot: plan.name,
        results: { create: results.map((result, position) => ({ exerciseId: result.exerciseId, exerciseNameSnapshot: exercisesById.get(result.exerciseId)!.name, sets: result.sets, reps: result.reps, position })) },
      },
    });
    if (plan.linkedActivity?.active) {
      await transaction.lifeCompletion.upsert({
        where: { activityId_localDate: { activityId: plan.linkedActivity.id, localDate: parsed.data.localDate } },
        update: { status: parsed.data.status, durationMinutes: parsed.data.durationMinutes, snoozedUntil: null, titleSnapshot: plan.linkedActivity.title },
        create: { userId, activityId: plan.linkedActivity.id, localDate: parsed.data.localDate, status: parsed.data.status, durationMinutes: parsed.data.durationMinutes, titleSnapshot: plan.linkedActivity.title },
      });
    }
  });
  refresh();
}

export async function createCreativeProject(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = creativeProjectSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid creative project");
  await validateActivity(userId, parsed.data.activityId);
  await prisma.lifeCreativeProject.create({ data: { ...parsed.data, userId, description: parsed.data.description || null } });
  refresh();
}

export async function updateCreativeProjectStatus(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = creativeProjectStatusSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid project update");
  const result = await prisma.lifeCreativeProject.updateMany({ where: { id: parsed.data.id, userId }, data: { status: parsed.data.status } });
  if (!result.count) throw new Error("Creative project not found");
  refresh();
}

export async function logCreativeSession(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = creativeSessionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid creative session");
  const project = parsed.data.projectId ? await prisma.lifeCreativeProject.findFirst({
    where: { id: parsed.data.projectId, userId },
    include: { linkedActivity: { select: { id: true, title: true, active: true } } },
  }) : null;
  if (parsed.data.projectId && !project) throw new Error("Creative project not found");
  await prisma.$transaction(async (transaction) => {
    await transaction.lifeCreativeSession.create({
      data: {
        userId,
        projectId: project?.id ?? null,
        localDate: parsed.data.localDate,
        activityType: parsed.data.activityType,
        durationMinutes: parsed.data.durationMinutes,
        note: parsed.data.note || null,
        projectNameSnapshot: project?.name ?? null,
      },
    });
    if (project?.linkedActivity?.active) {
      await transaction.lifeCompletion.upsert({
        where: { activityId_localDate: { activityId: project.linkedActivity.id, localDate: parsed.data.localDate } },
        update: { status: "COMPLETED", durationMinutes: parsed.data.durationMinutes, snoozedUntil: null, titleSnapshot: project.linkedActivity.title },
        create: { userId, activityId: project.linkedActivity.id, localDate: parsed.data.localDate, status: "COMPLETED", durationMinutes: parsed.data.durationMinutes, titleSnapshot: project.linkedActivity.title },
      });
    }
  });
  refresh();
}
