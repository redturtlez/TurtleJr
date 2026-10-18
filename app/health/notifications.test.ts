import assert from "node:assert/strict";
import test from "node:test";
import {
  activityReminderBody,
  dailyDigestBody,
  dailyDigestFingerprint,
  deliveryClaimIsAvailable,
  digestIsDue,
  inAppReminderCandidates,
  isWithinQuietHours,
  occurrenceIsDue,
  outstandingReminderActivities,
  retryDelayMinutes,
  scheduledPushReminderOccurrences,
  shiftLocalDate,
  weekdayForLocalDate,
  type ReminderActivity,
} from "./notifications.ts";
import { notificationSettingsSchema, pushSubscriptionSchema } from "./validation.ts";
import { cronRequestIsAuthorized } from "./notificationSecurity.ts";

const activity = (overrides: Partial<ReminderActivity> = {}): ReminderActivity => ({ id: "a", kind: "HABIT", title: "Walk", position: 0, scheduleType: "FIXED_TIME", fixedTimeMinutes: 540, windowStartMinutes: null, windowEndMinutes: null, daysOfWeek: [1], importance: "OPTIONAL", estimatedDurationMinutes: 10, reminderEnabled: true, ...overrides });
const context = { localDate: "2026-10-19", dayOfWeek: 1, minutesSinceMidnight: 540, nowIso: "2026-10-19T13:00:00.000Z" };

test("quiet hours support overnight windows and treat incomplete pairs as disabled", () => {
  assert.equal(isWithinQuietHours(30, 1320, 420), true);
  assert.equal(isWithinQuietHours(600, 1320, 420), false);
  assert.equal(isWithinQuietHours(30, null, 420), false);
});

test("daily reminders exclude completed, skipped, snoozed, disabled, and unscheduled activities", () => {
  const activities = [activity(), activity({ id: "disabled", reminderEnabled: false }), activity({ id: "other-day", daysOfWeek: [2] }), activity({ id: "done" }), activity({ id: "snoozed" })];
  const completions = [{ activityId: "done", status: "COMPLETED" as const, snoozedUntil: null }, { activityId: "snoozed", status: "SNOOZED" as const, snoozedUntil: "2026-10-19T14:00:00.000Z" }];
  assert.deepEqual(outstandingReminderActivities(activities, completions, context).map((item) => item.id), ["a"]);
});

test("in-app reminders fire only near fixed times or flexible-window starts", () => {
  const activities = [activity(), activity({ id: "window", scheduleType: "FLEXIBLE_WINDOW", fixedTimeMinutes: null, windowStartMinutes: 538, windowEndMinutes: 700 }), activity({ id: "later", fixedTimeMinutes: 600 }), activity({ id: "sequential", scheduleType: "SEQUENTIAL", fixedTimeMinutes: null })];
  assert.deepEqual(inAppReminderCandidates(activities, [], context).map((item) => item.id), ["a", "window"]);
});

test("digest privacy defaults to a count and names are opt-in", () => {
  const activities = [activity({ title: "Medication" }), activity({ id: "b", title: "Walk" })];
  assert.equal(dailyDigestBody(activities, false), "2 reminder-enabled activities are still open today.");
  assert.equal(dailyDigestBody(activities, false, "yesterday"), "2 reminder-enabled activities are still open from yesterday.");
  assert.equal(dailyDigestBody(activities, true), "Medication · Walk");
  assert.equal(activityReminderBody(activities, false), "2 scheduled activities are ready.");
  assert.equal(dailyDigestFingerprint("2026-10-19"), "daily-digest:2026-10-19");
});

test("notification preferences require a complete, non-zero quiet-hours window", () => {
  const base = { dailyDigestEnabled: true, dailyDigestMinutes: 1080, activityPushRemindersEnabled: false, inAppRemindersEnabled: true, showActivityNames: false };
  assert.equal(notificationSettingsSchema.safeParse({ ...base, quietStartMinutes: null, quietEndMinutes: null }).success, true);
  assert.equal(notificationSettingsSchema.safeParse({ ...base, quietStartMinutes: 1320, quietEndMinutes: 420 }).success, true);
  assert.equal(notificationSettingsSchema.safeParse({ ...base, quietStartMinutes: 1320, quietEndMinutes: null }).success, false);
  assert.equal(notificationSettingsSchema.safeParse({ ...base, quietStartMinutes: 420, quietEndMinutes: 420 }).success, false);
});

test("push subscriptions require HTTPS endpoints and bounded base64url keys", () => {
  const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/subscription", expirationTime: null, keys: { p256dh: "abcdefgh_123", auth: "abcdefgh-456" }, userAgent: null };
  assert.equal(pushSubscriptionSchema.safeParse(valid).success, true);
  assert.equal(pushSubscriptionSchema.safeParse({ ...valid, endpoint: "http://push.example.test/subscription" }).success, false);
  assert.equal(pushSubscriptionSchema.safeParse({ ...valid, endpoint: "https://private.example.test/subscription" }).success, false);
  assert.equal(pushSubscriptionSchema.safeParse({ ...valid, keys: { ...valid.keys, auth: "bad key" } }).success, false);
});

test("local date helpers remain deterministic across month and year boundaries", () => {
  assert.equal(shiftLocalDate("2026-01-01", -1), "2025-12-31");
  assert.equal(weekdayForLocalDate("2026-10-19"), 1);
});

test("scheduled occurrences have a bounded catch-up window", () => {
  assert.equal(occurrenceIsDue("2026-10-19", 540, context, null, null), true);
  assert.equal(occurrenceIsDue("2026-10-19", 449, context, null, null), false);
  assert.equal(occurrenceIsDue("2026-10-19", 600, context, null, null), false);
});

test("quiet-hour occurrences release after quiet hours, including overnight", () => {
  const afternoon = { ...context, minutesSinceMidnight: 855 };
  assert.equal(occurrenceIsDue("2026-10-19", 810, afternoon, 780, 840), true);
  const morning = { ...context, localDate: "2026-10-20", dayOfWeek: 2, minutesSinceMidnight: 430, nowIso: "2026-10-20T11:10:00.000Z" };
  assert.equal(occurrenceIsDue("2026-10-19", 1380, morning, 1320, 420), true);
  assert.equal(occurrenceIsDue("2026-10-20", 60, morning, 1320, 420), true);
  assert.equal(occurrenceIsDue("2026-10-19", 1200, morning, 1320, 420), false);
});

test("scheduled push reminders select due activities and expired snoozes", () => {
  const activities = [
    activity(),
    activity({ id: "window", scheduleType: "FLEXIBLE_WINDOW", fixedTimeMinutes: null, windowStartMinutes: 525, windowEndMinutes: 700 }),
    activity({ id: "sequential", scheduleType: "SEQUENTIAL", fixedTimeMinutes: null }),
    activity({ id: "done" }),
    activity({ id: "snoozed" }),
  ];
  const completions = [
    { activityId: "done", localDate: "2026-10-19", status: "COMPLETED" as const, snoozedUntil: null },
    { activityId: "snoozed", localDate: "2026-10-19", status: "SNOOZED" as const, snoozedUntil: "2026-10-19T12:45:00.000Z", snoozedLocalDate: "2026-10-19", snoozedMinutes: 525 },
  ];
  assert.deepEqual(
    scheduledPushReminderOccurrences(activities, completions, context, null, null).map((item) => item.activityId),
    ["a", "window", "snoozed"],
  );
});

test("daily digest uses the same quiet-hour release behavior", () => {
  const morning = { ...context, localDate: "2026-10-20", dayOfWeek: 2, minutesSinceMidnight: 430, nowIso: "2026-10-20T11:10:00.000Z" };
  assert.equal(digestIsDue("2026-10-19", 1380, morning, 1320, 420), true);
  assert.equal(digestIsDue("2026-10-20", 1080, morning, 1320, 420), false);
});

test("delivery retries are bounded to three attempts", () => {
  assert.equal(retryDelayMinutes(1), 30);
  assert.equal(retryDelayMinutes(2), 30);
  assert.equal(retryDelayMinutes(3), null);
});

test("delivery claims reject duplicates and allow only stale or eligible retries", () => {
  const now = new Date("2026-10-19T13:00:00.000Z");
  assert.equal(deliveryClaimIsAvailable({ status: "SENT", attemptCount: 1, nextAttemptAt: null, updatedAt: new Date("2026-10-19T12:00:00.000Z") }, now), false);
  assert.equal(deliveryClaimIsAvailable({ status: "PENDING", attemptCount: 1, nextAttemptAt: null, updatedAt: new Date("2026-10-19T12:55:00.000Z") }, now), false);
  assert.equal(deliveryClaimIsAvailable({ status: "PENDING", attemptCount: 1, nextAttemptAt: null, updatedAt: new Date("2026-10-19T12:40:00.000Z") }, now), true);
  assert.equal(deliveryClaimIsAvailable({ status: "FAILED", attemptCount: 2, nextAttemptAt: new Date("2026-10-19T13:30:00.000Z"), updatedAt: now }, now), false);
  assert.equal(deliveryClaimIsAvailable({ status: "FAILED", attemptCount: 2, nextAttemptAt: now, updatedAt: now }, now), true);
  assert.equal(deliveryClaimIsAvailable({ status: "FAILED", attemptCount: 3, nextAttemptAt: null, updatedAt: now }, now), false);
});

test("cron authorization requires an exact bearer token", () => {
  const request = (authorization?: string): Request => new Request("https://example.test/api/notifications/daily", {
    headers: authorization ? { authorization } : {},
  });
  assert.equal(cronRequestIsAuthorized(request("Bearer a-secure-cron-secret"), "a-secure-cron-secret"), true);
  assert.equal(cronRequestIsAuthorized(request("Bearer wrong-secret"), "a-secure-cron-secret"), false);
  assert.equal(cronRequestIsAuthorized(request(), "a-secure-cron-secret"), false);
  assert.equal(cronRequestIsAuthorized(request("Bearer a-secure-cron-secret"), undefined), false);
});
