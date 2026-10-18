import assert from "node:assert/strict";
import test from "node:test";
import { buildHabitPatterns, buildRecommendations, buildWeeklyTrends, shiftDateKey } from "./analytics.ts";
import type { ScheduledActivity } from "./scheduling.ts";
import { goalProgressSchema, goalSchema } from "./validation.ts";

const daily: ScheduledActivity = { id: "habit", kind: "HABIT", title: "Walk", position: 0, scheduleType: "SEQUENTIAL", fixedTimeMinutes: null, windowStartMinutes: null, windowEndMinutes: null, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], importance: "OPTIONAL", estimatedDurationMinutes: 20 };

test("weekly trends count scheduled and completed occurrences", () => {
  const trends = buildWeeklyTrends([daily], [
    { activityId: "habit", localDate: "2026-10-15", status: "COMPLETED" },
    { activityId: "habit", localDate: "2026-10-16", status: "SKIPPED" },
  ], "2026-10-17", 1);
  assert.deepEqual(trends[0], { startDate: "2026-10-11", endDate: "2026-10-17", scheduled: 7, completed: 1, skipped: 1, rate: 14 });
});

test("analytics do not count dates before an activity existed", () => {
  const trends = buildWeeklyTrends([{ ...daily, activeFromDate: "2026-10-15" }], [{ activityId: "habit", localDate: "2026-10-15", status: "COMPLETED" }], "2026-10-17", 1);
  assert.deepEqual(trends[0], { startDate: "2026-10-11", endDate: "2026-10-17", scheduled: 3, completed: 1, skipped: 0, rate: 33 });
});

test("recommendations require enough scheduled history and explain evidence", () => {
  const completions = Array.from({ length: 12 }, (_, index) => ({ activityId: "habit", localDate: `2026-10-${String(index + 4).padStart(2, "0")}`, status: "COMPLETED" as const }));
  const recommendations = buildRecommendations([daily], completions, "2026-10-17");
  assert.equal(recommendations.length, 1);
  assert.match(recommendations[0]?.evidence ?? "", /12 of 14/);
});

test("recommendations do not fire for sparse schedules", () => {
  assert.equal(buildRecommendations([{ ...daily, daysOfWeek: [1] }], [], "2026-10-17").length, 0);
});

test("habit patterns compare consecutive periods only with enough evidence", () => {
  const previous = Array.from({ length: 12 }, (_, index) => ({ activityId: "habit", localDate: shiftDateKey("2026-09-20", index), status: "COMPLETED" as const }));
  const current = Array.from({ length: 4 }, (_, index) => ({ activityId: "habit", localDate: shiftDateKey("2026-10-04", index), status: "COMPLETED" as const }));
  const patterns = buildHabitPatterns([daily], [...previous, ...current], "2026-10-17");
  const decline = patterns.find((item) => item.kind === "DECLINING");
  assert.ok(decline);
  assert.match(decline.evidence, /86%.*29%/);
});

test("weekday friction requires a meaningful repeated difference", () => {
  const twoDays = { ...daily, daysOfWeek: [1, 2] };
  const completions = Array.from({ length: 56 }, (_, index) => shiftDateKey("2026-08-23", index))
    .filter((date) => new Date(`${date}T00:00:00.000Z`).getUTCDay() === 1)
    .map((localDate) => ({ activityId: "habit", localDate, status: "COMPLETED" as const }));
  const patterns = buildHabitPatterns([twoDays], completions, "2026-10-17");
  const friction = patterns.find((item) => item.kind === "WEEKDAY_FRICTION");
  assert.ok(friction);
  assert.match(friction.title, /Tuesday/);
  assert.match(friction.evidence, /Monday/);
});

test("recommendations are prioritized and limited", () => {
  const activities = Array.from({ length: 5 }, (_, index) => ({ ...daily, id: `habit-${index}`, title: `Habit ${index}` }));
  assert.equal(buildRecommendations(activities, [], "2026-10-17").length, 3);
});

test("qualitative goals are valid without a numeric target", () => {
  assert.equal(goalSchema.safeParse({ title: "Feel more rested", description: null, targetValue: null, targetUnit: null, targetDate: null, status: "ACTIVE", activityIds: [] }).success, true);
});

test("numeric goals require units and progress requires content", () => {
  assert.equal(goalSchema.safeParse({ title: "Walk", description: null, targetValue: 100, targetUnit: null, targetDate: null, status: "ACTIVE", activityIds: [] }).success, false);
  assert.equal(goalProgressSchema.safeParse({ goalId: "cm12345678901234567890123", localDate: "2026-10-17", value: null, note: null }).success, false);
});
