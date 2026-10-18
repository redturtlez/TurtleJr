import "server-only";

import webpush from "web-push";
import { env } from "@/env.mjs";

export interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: Date | null;
}

export interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  url?: "/health";
}

export function pushIsConfigured(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export function pushFailureStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

export async function sendPush(subscription: StoredPushSubscription, payload: NotificationPayload): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) throw new Error("Push delivery is not configured");
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  await webpush.sendNotification({
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime?.getTime() ?? null,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }, JSON.stringify({ ...payload, url: payload.url ?? "/health" }), { TTL: 60 * 60 * 6, urgency: "normal" });
}
