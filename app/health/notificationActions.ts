"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { pushFailureStatus, sendPush } from "./notificationDelivery";
import { notificationSettingsSchema, pushEndpointSchema, pushSubscriptionSchema } from "./validation";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to manage notifications");
  return userId;
}

export async function saveNotificationSettings(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid notification settings");
  try {
    await prisma.lifeProfile.upsert({ where: { userId }, update: {}, create: { userId } });
    await prisma.lifeNotificationSettings.upsert({ where: { userId }, update: parsed.data, create: { userId, ...parsed.data } });
  } catch {
    throw new Error("Could not save notification settings");
  }
  revalidatePath("/health", "layout");
}

export async function subscribeToPush(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid push subscription");
  const existing = await prisma.lifePushSubscription.findUnique({ where: { endpoint: parsed.data.endpoint }, select: { userId: true } });
  if (existing && existing.userId !== userId) throw new Error("This browser subscription belongs to another account");
  try {
    await prisma.lifeProfile.upsert({ where: { userId }, update: {}, create: { userId } });
    await prisma.lifePushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: { p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, expirationTime: parsed.data.expirationTime ? new Date(parsed.data.expirationTime) : null, userAgent: parsed.data.userAgent, active: true },
      create: { userId, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, expirationTime: parsed.data.expirationTime ? new Date(parsed.data.expirationTime) : null, userAgent: parsed.data.userAgent },
    });
    const extras = await prisma.lifePushSubscription.findMany({ where: { userId, active: true }, orderBy: { updatedAt: "desc" }, skip: 10, select: { id: true } });
    if (extras.length) await prisma.lifePushSubscription.updateMany({ where: { userId, id: { in: extras.map((item) => item.id) } }, data: { active: false } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("another account")) throw error;
    throw new Error("Could not save the push subscription");
  }
  revalidatePath("/health", "layout");
}

export async function unsubscribeFromPush(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = pushEndpointSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid push subscription");
  try {
    await prisma.lifePushSubscription.updateMany({ where: { userId, endpoint: parsed.data }, data: { active: false } });
  } catch {
    throw new Error("Could not disable the push subscription");
  }
  revalidatePath("/health", "layout");
}

export async function sendTestPush(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = pushEndpointSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid push subscription");
  const subscription = await prisma.lifePushSubscription.findFirst({ where: { userId, endpoint: parsed.data, active: true } });
  if (!subscription) throw new Error("This browser is not subscribed");
  const claim = await prisma.lifePushSubscription.updateMany({
    where: { id: subscription.id, userId, active: true, OR: [{ lastTestedAt: null }, { lastTestedAt: { lte: new Date(Date.now() - 30_000) } }] },
    data: { lastTestedAt: new Date() },
  });
  if (claim.count !== 1) throw new Error("Wait 30 seconds before sending another test");
  try {
    await sendPush(subscription, { title: "Turtle Jr reminders are ready", body: "This browser can receive your private daily reminder digest.", tag: "life-dashboard-test" });
  } catch (error) {
    const status = pushFailureStatus(error);
    if (status === 404 || status === 410) await prisma.lifePushSubscription.updateMany({ where: { id: subscription.id, userId }, data: { active: false } });
    throw new Error(status === 404 || status === 410 ? "This browser subscription expired; enable it again" : "Could not send the test notification");
  }
}
