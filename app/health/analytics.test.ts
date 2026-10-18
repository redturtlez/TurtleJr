import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendations, buildWeeklyTrends } from "./analytics.ts";
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

test("recommendations require enough scheduled history and explain evidence", () => {
  const completions = Array.from({ length: 12 }, (_, index) => ({ activityId: "habit", localDate: `2026-10-${String(index + 4).padStart(2, "0")}`, status: "COMPLETED" as const }));
  const recommendations = buildRecommendations([daily], completions, "2026-10-17");
  assert.equal(recommendations.length, 1);
  assert.match(recommendations[0]?.evidence ?? "", /12 of 14/);
});

test("recommendations do not fire for sparse schedules", () => {
  assert.equal(buildRecommendations([{ ...daily, daysOfWeek: [1] }], [], "2026-10-17").length, 0);
});

test("qualitative goals are valid without a numeric target", () => {
  assert.equal(goalSchema.safeParse({ title: "Feel more rested", description: null, targetValue: null, targetUnit: null, targetDate: null, status: "ACTIVE", activityIds: [] }).success, true);
});

test("numeric goals require units and progress requires content", () => {
  assert.equal(goalSchema.safeParse({ title: "Walk", description: null, targetValue: 100, targetUnit: null, targetDate: null, status: "ACTIVE", activityIds: [] }).success, false);
  assert.equal(goalProgressSchema.safeParse({ goalId: "cm12345678901234567890123", localDate: "2026-10-17", value: null, note: null }).success, false);
});
