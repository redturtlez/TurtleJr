import assert from "node:assert/strict";
import test from "node:test";
import { getLocalDayContext, selectNextActivity, type ScheduledActivity } from "./scheduling.ts";
import { activitySchema, statusSchema } from "./validation.ts";

const base: ScheduledActivity = {
  id: "routine",
  kind: "ROUTINE",
  title: "Morning routine",
  position: 0,
  scheduleType: "SEQUENTIAL",
  fixedTimeMinutes: null,
  windowStartMinutes: null,
  windowEndMinutes: null,
  daysOfWeek: [1],
  importance: "ESSENTIAL",
  estimatedDurationMinutes: 15,
};

test("local day context respects the configured timezone", () => {
  const context = getLocalDayContext(new Date("2026-10-19T02:30:00.000Z"), "America/New_York");
  assert.equal(context.localDate, "2026-10-18");
  assert.equal(context.dayOfWeek, 0);
  assert.equal(context.minutesSinceMidnight, 22 * 60 + 30);
});

test("an overdue fixed anchor wins over sequential work", () => {
  const fixed: ScheduledActivity = { ...base, id: "fixed", title: "Start work", scheduleType: "FIXED_TIME", fixedTimeMinutes: 9 * 60 };
  const result = selectNextActivity([base, fixed], [], { localDate: "2026-10-19", dayOfWeek: 1, minutesSinceMidnight: 9 * 60 + 5, nowIso: "2026-10-19T13:05:00.000Z" });
  assert.equal(result?.activity.id, "fixed");
});

test("completed, skipped, and actively snoozed activities are excluded", () => {
  const second = { ...base, id: "second", title: "Second", position: 1 };
  const result = selectNextActivity(
    [base, second],
    [
      { activityId: "routine", status: "COMPLETED", snoozedUntil: null },
      { activityId: "second", status: "SNOOZED", snoozedUntil: "2026-10-19T14:00:00.000Z" },
    ],
    { localDate: "2026-10-19", dayOfWeek: 1, minutesSinceMidnight: 9 * 60, nowIso: "2026-10-19T13:00:00.000Z" },
  );
  assert.equal(result, null);
});

test("a snoozed activity returns after its snooze expires", () => {
  const result = selectNextActivity(
    [base],
    [{ activityId: "routine", status: "SNOOZED", snoozedUntil: "2026-10-19T12:30:00.000Z" }],
    { localDate: "2026-10-19", dayOfWeek: 1, minutesSinceMidnight: 9 * 60, nowIso: "2026-10-19T13:00:00.000Z" },
  );
  assert.equal(result?.activity.id, "routine");
});

test("activities on another weekday are excluded", () => {
  const result = selectNextActivity([base], [], { localDate: "2026-10-20", dayOfWeek: 2, minutesSinceMidnight: 9 * 60, nowIso: "2026-10-20T13:00:00.000Z" });
  assert.equal(result, null);
});

const validActivity = {
  kind: "ROUTINE",
  title: "Morning workout",
  description: null,
  scheduleType: "SEQUENTIAL",
  fixedTimeMinutes: null,
  windowStartMinutes: null,
  windowEndMinutes: null,
  estimatedDurationMinutes: 20,
  minimumDurationMinutes: 10,
  preferredDurationMinutes: 20,
  daysOfWeek: [1, 3, 5],
  importance: "ESSENTIAL",
  reminderEnabled: false,
} as const;

test("activity validation rejects invalid windows, duplicate days, and excessive durations", () => {
  assert.equal(activitySchema.safeParse({ ...validActivity, scheduleType: "FLEXIBLE_WINDOW", windowStartMinutes: 900, windowEndMinutes: 800 }).success, false);
  assert.equal(activitySchema.safeParse({ ...validActivity, daysOfWeek: [1, 1] }).success, false);
  assert.equal(activitySchema.safeParse({ ...validActivity, preferredDurationMinutes: 721 }).success, false);
});

test("completion validation rejects malformed dates and identifiers", () => {
  assert.equal(statusSchema.safeParse({ activityId: "not-an-id", localDate: "10/17/2026", status: "COMPLETED", durationMinutes: null }).success, false);
});
