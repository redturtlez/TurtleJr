import "server-only";

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

export type ReminderSettingsData = Pick<NotificationDashboardData["settings"], "inAppRemindersEnabled" | "quietStartMinutes" | "quietEndMinutes">;

const defaultNotificationSettings: NotificationDashboardData["settings"] = {
  dailyDigestEnabled: false,
  dailyDigestMinutes: 1080,
  activityPushRemindersEnabled: false,
  inAppRemindersEnabled: true,
  quietStartMinutes: null,
  quietEndMinutes: null,
  showActivityNames: false,
};

export async function getReminderSettings(userId: string): Promise<ReminderSettingsData> {
  return await prisma.lifeNotificationSettings.findUnique({
    where: { userId },
    select: { inAppRemindersEnabled: true, quietStartMinutes: true, quietEndMinutes: true },
  }) ?? {
    inAppRemindersEnabled: defaultNotificationSettings.inAppRemindersEnabled,
    quietStartMinutes: defaultNotificationSettings.quietStartMinutes,
    quietEndMinutes: defaultNotificationSettings.quietEndMinutes,
  };
}

export async function getNotificationDashboardData(userId: string): Promise<NotificationDashboardData> {
  try {
    const [settings, activeSubscriptionCount] = await Promise.all([
      prisma.lifeNotificationSettings.findUnique({ where: { userId } }),
      prisma.lifePushSubscription.count({ where: { userId, active: true } }),
    ]);
    const resolvedSettings = settings ?? defaultNotificationSettings;
    const configured = pushIsConfigured();
    return {
      settings: {
        dailyDigestEnabled: resolvedSettings.dailyDigestEnabled,
        dailyDigestMinutes: resolvedSettings.dailyDigestMinutes,
        activityPushRemindersEnabled: resolvedSettings.activityPushRemindersEnabled,
        inAppRemindersEnabled: resolvedSettings.inAppRemindersEnabled,
        quietStartMinutes: resolvedSettings.quietStartMinutes,
        quietEndMinutes: resolvedSettings.quietEndMinutes,
        showActivityNames: resolvedSettings.showActivityNames,
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
