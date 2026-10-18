import assert from "node:assert/strict";
import test from "node:test";
import { buildWellnessSummary, exerciseProgress } from "./wellness.ts";
import { creativeSessionSchema, workoutPlanSchema } from "./validation.ts";

test("weekly wellness summary counts completed workouts and creative sessions", () => {
  const summary = buildWellnessSummary(
    [
      { localDate: "2026-10-17", status: "COMPLETED", durationMinutes: 20 },
      { localDate: "2026-10-16", status: "SKIPPED", durationMinutes: null },
      { localDate: "2026-10-09", status: "COMPLETED", durationMinutes: 60 },
    ],
    [
      { localDate: "2026-10-15", durationMinutes: 45 },
      { localDate: "2026-10-11", durationMinutes: null },
      { localDate: "2026-10-10", durationMinutes: 90 },
    ],
    "2026-10-17",
  );
  assert.deepEqual(summary, { workoutCount: 1, workoutMinutes: 20, creativeCount: 2, creativeMinutes: 45 });
});

test("exercise progression excludes skips and preserves missing values", () => {
  const history = exerciseProgress([
    { localDate: "2026-10-15", status: "COMPLETED", results: [{ exerciseId: "pushup", sets: 3, reps: 12 }] },
    { localDate: "2026-10-17", status: "COMPLETED", results: [{ exerciseId: "pushup", sets: 4, reps: null }] },
    { localDate: "2026-10-16", status: "SKIPPED", results: [{ exerciseId: "pushup", sets: 9, reps: 99 }] },
  ], "pushup");
  assert.deepEqual(history, [
    { localDate: "2026-10-17", sets: 4, reps: null },
    { localDate: "2026-10-15", sets: 3, reps: 12 },
  ]);
});

test("workout validation rejects duplicate exercise names", () => {
  const result = workoutPlanSchema.safeParse({
    name: "Morning strength",
    description: null,
    estimatedDurationMinutes: 20,
    activityId: null,
    exercises: [
      { name: "Push-up", targetSets: 3, targetReps: 10 },
      { name: "push-UP", targetSets: 4, targetReps: 8 },
    ],
  });
  assert.equal(result.success, false);
});

test("creative session validation permits notes without invented duration", () => {
  const result = creativeSessionSchema.safeParse({ projectId: null, localDate: "2026-10-17", activityType: "Drawing", durationMinutes: null, note: "Practiced hands" });
  assert.equal(result.success, true);
});
