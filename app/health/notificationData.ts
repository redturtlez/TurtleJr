import "server-only";

import { auth } from "@clerk/nextjs/server";
import { env } from "@/env.mjs";
import { prisma } from "@/lib/database";
import { pushIsConfigured } from "./notificationDelivery";

export interface NotificationDashboardData {
  settings: {
    dailyDigestEnabled: boolean;
    dailyDigestMinutes: number;
    activityPushRemindersEnabled: boolean;
    inAppRemindersEnabled: boolean;
    quietStartMinutes: number | null;
    quietEndMinutes: number | null;
    showActivityNames: boolean;
  };
  activeSubscriptionCount: number;
  pushConfigured: boolean;
  vapidPublicKey: string | null;
  cronConfigured: boolean;
  schedule: string;
}

export async function getNotificationDashboardData(): Promise<NotificationDashboardData> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to view notification settings");
  try {
    await prisma.lifeProfile.upsert({ where: { userId }, update: {}, create: { userId } });
    const [settings, activeSubscriptionCount] = await Promise.all([
      prisma.lifeNotificationSettings.upsert({ where: { userId }, update: {}, create: { userId } }),
      prisma.lifePushSubscription.count({ where: { userId, active: true } }),
    ]);
    const configured = pushIsConfigured();
    return {
      settings: {
        dailyDigestEnabled: settings.dailyDigestEnabled,
        dailyDigestMinutes: settings.dailyDigestMinutes,
        activityPushRemindersEnabled: settings.activityPushRemindersEnabled,
        inAppRemindersEnabled: settings.inAppRemindersEnabled,
        quietStartMinutes: settings.quietStartMinutes,
        quietEndMinutes: settings.quietEndMinutes,
        showActivityNames: settings.showActivityNames,
      },
      activeSubscriptionCount,
      pushConfigured: configured,
      vapidPublicKey: configured ? env.VAPID_PUBLIC_KEY ?? null : null,
      cronConfigured: Boolean(env.CRON_SECRET),
      schedule: "Checked every 30 minutes after the external scheduler is enabled",
    };
  } catch {
    throw new Error("Could not load notification settings");
  }
}
