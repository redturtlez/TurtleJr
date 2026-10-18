import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database";
import { getLocalDayContext } from "./scheduling";
import {
  activityReminderBody,
  dailyDigestBody,
  dailyDigestFingerprint,
  deliveryClaimIsAvailable,
  digestIsDue,
  isWithinQuietHours,
  outstandingReminderActivities,
  retryDelayMinutes,
  scheduledPushReminderOccurrences,
  shiftLocalDate,
  weekdayForLocalDate,
} from "./notifications";
import { pushFailureStatus, sendPush } from "./notificationDelivery";

export interface DeliverySummary {
  usersConsidered: number;
  sent: number;
  skipped: number;
  failed: number;
  expired: number;
}

interface DeliveryClaim {
  id: string;
  attemptCount: number;
}

async function reserveDelivery(
  userId: string,
  subscriptionId: string,
  fingerprint: string,
  kind: "DAILY_DIGEST" | "ACTIVITY_REMINDER",
  now: Date,
): Promise<DeliveryClaim | null> {
  const existing = await prisma.lifeNotificationDelivery.findUnique({
    where: { subscriptionId_fingerprint: { subscriptionId, fingerprint } },
    select: { id: true, status: true, attemptCount: true, nextAttemptAt: true, updatedAt: true },
  });
  if (existing) {
    if (!deliveryClaimIsAvailable(existing, now)) return null;
    const claimed = await prisma.lifeNotificationDelivery.updateMany({
      where: { id: existing.id, status: existing.status, updatedAt: existing.updatedAt },
      data: { status: "PENDING", attemptCount: { increment: 1 }, nextAttemptAt: null, errorCode: null, sentAt: null },
    });
    return claimed.count === 1 ? { id: existing.id, attemptCount: existing.attemptCount + 1 } : null;
  }
  try {
    const created = await prisma.lifeNotificationDelivery.create({
      data: { userId, subscriptionId, fingerprint, kind, attemptCount: 1 },
      select: { id: true, attemptCount: true },
    });
    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }
}

function digestContext(localDate: string, now: Date) {
  return { localDate, dayOfWeek: weekdayForLocalDate(localDate), minutesSinceMidnight: 0, nowIso: now.toISOString() };
}

export async function deliverNotificationChecks(now = new Date()): Promise<DeliverySummary> {
  const summary: DeliverySummary = { usersConsidered: 0, sent: 0, skipped: 0, failed: 0, expired: 0 };
  const recipients = await prisma.lifeNotificationSettings.findMany({
    where: { OR: [{ dailyDigestEnabled: true }, { activityPushRemindersEnabled: true }] },
    select: {
      userId: true,
      dailyDigestEnabled: true,
      dailyDigestMinutes: true,
      activityPushRemindersEnabled: true,
      quietStartMinutes: true,
      quietEndMinutes: true,
      showActivityNames: true,
      profile: { select: { timeZone: true } },
    },
  });

  for (const recipient of recipients) {
    summary.usersConsidered += 1;
    const context = getLocalDayContext(now, recipient.profile.timeZone);
    if (isWithinQuietHours(context.minutesSinceMidnight, recipient.quietStartMinutes, recipient.quietEndMinutes)) {
      summary.skipped += 1;
      continue;
    }
    const previousLocalDate = shiftLocalDate(context.localDate, -1);
    const [activities, completions, subscriptions] = await Promise.all([
      prisma.lifeActivity.findMany({ where: { userId: recipient.userId, active: true, reminderEnabled: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
      prisma.lifeCompletion.findMany({ where: { userId: recipient.userId, localDate: { in: [previousLocalDate, context.localDate] } }, select: { activityId: true, localDate: true, status: true, snoozedUntil: true } }),
      prisma.lifePushSubscription.findMany({ where: { userId: recipient.userId, active: true }, orderBy: { updatedAt: "desc" } }),
    ]);
    if (!subscriptions.length) {
      summary.skipped += 1;
      continue;
    }
    const normalizedCompletions = completions.map((completion) => {
      const snoozeContext = completion.snoozedUntil ? getLocalDayContext(completion.snoozedUntil, recipient.profile.timeZone) : null;
      return {
        ...completion,
        snoozedUntil: completion.snoozedUntil?.toISOString() ?? null,
        snoozedLocalDate: snoozeContext?.localDate ?? null,
        snoozedMinutes: snoozeContext?.minutesSinceMidnight ?? null,
      };
    });
    const digestDate = recipient.dailyDigestEnabled
      ? [previousLocalDate, context.localDate].find((localDate) => digestIsDue(localDate, recipient.dailyDigestMinutes, context, recipient.quietStartMinutes, recipient.quietEndMinutes)) ?? null
      : null;
    const digestCompletions = digestDate
      ? normalizedCompletions.filter((completion) => completion.localDate === digestDate)
      : [];
    const outstanding = digestDate
      ? outstandingReminderActivities(activities, digestCompletions, digestContext(digestDate, now))
      : [];
    const occurrences = recipient.activityPushRemindersEnabled
      ? scheduledPushReminderOccurrences(activities, normalizedCompletions, context, recipient.quietStartMinutes, recipient.quietEndMinutes)
      : [];
    if ((!digestDate || !outstanding.length) && !occurrences.length) {
      summary.skipped += 1;
      continue;
    }
    for (const subscription of subscriptions) {
      const digestClaim = digestDate && outstanding.length
        ? await reserveDelivery(recipient.userId, subscription.id, dailyDigestFingerprint(digestDate), "DAILY_DIGEST", now)
        : null;
      const activityClaims = (await Promise.all(occurrences.map(async (occurrence) => ({
        occurrence,
        claim: await reserveDelivery(recipient.userId, subscription.id, occurrence.fingerprint, "ACTIVITY_REMINDER", now),
      })))).filter((item): item is typeof item & { claim: DeliveryClaim } => item.claim !== null);
      const claims = [...(digestClaim ? [digestClaim] : []), ...activityClaims.map((item) => item.claim)];
      if (!claims.length) {
        summary.skipped += 1;
        continue;
      }
      const body = digestClaim && digestDate
        ? dailyDigestBody(outstanding, recipient.showActivityNames, digestDate === context.localDate ? "today" : "yesterday")
        : activityReminderBody(activityClaims.map((item) => item.occurrence), recipient.showActivityNames);
      const tag = digestClaim && digestDate ? dailyDigestFingerprint(digestDate) : `activity-reminders:${context.localDate}`;
      try {
        await sendPush(subscription, { title: digestClaim ? "Your Turtle Jr daily check-in" : "Turtle Jr activity reminder", body, tag });
        await prisma.lifeNotificationDelivery.updateMany({ where: { id: { in: claims.map((claim) => claim.id) } }, data: { status: "SENT", sentAt: new Date(), nextAttemptAt: null, errorCode: null } });
        summary.sent += 1;
      } catch (error) {
        const status = pushFailureStatus(error);
        const expired = status === 404 || status === 410;
        await prisma.$transaction([
          ...claims.map((claim) => {
            const delayMinutes = retryDelayMinutes(claim.attemptCount);
            return prisma.lifeNotificationDelivery.update({
              where: { id: claim.id },
              data: {
                status: "FAILED",
                errorCode: status ? `HTTP_${status}` : "DELIVERY_FAILED",
                nextAttemptAt: expired || delayMinutes === null ? null : new Date(now.getTime() + delayMinutes * 60_000),
              },
            });
          }),
          ...(expired ? [prisma.lifePushSubscription.update({ where: { id: subscription.id }, data: { active: false } })] : []),
        ]);
        if (expired) summary.expired += 1;
        else summary.failed += 1;
      }
    }
  }
  return summary;
}

export const deliverDailyDigests = deliverNotificationChecks;
