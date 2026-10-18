import { shiftDateKey } from "./analytics.ts";

export interface WorkoutSummarySession {
  localDate: string;
  status: "COMPLETED" | "SKIPPED";
  durationMinutes: number | null;
}

export interface CreativeSummarySession {
  localDate: string;
  durationMinutes: number | null;
}

export interface ExerciseProgressSession {
  localDate: string;
  status: "COMPLETED" | "SKIPPED";
  results: Array<{ exerciseId: string | null; sets: number | null; reps: number | null }>;
}

export function buildWellnessSummary(
  workoutSessions: WorkoutSummarySession[],
  creativeSessions: CreativeSummarySession[],
  localDate: string,
): { workoutCount: number; workoutMinutes: number; creativeCount: number; creativeMinutes: number } {
  const start = shiftDateKey(localDate, -6);
  const workouts = workoutSessions.filter((session) => session.localDate >= start && session.localDate <= localDate && session.status === "COMPLETED");
  const creative = creativeSessions.filter((session) => session.localDate >= start && session.localDate <= localDate);
  return {
    workoutCount: workouts.length,
    workoutMinutes: workouts.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
    creativeCount: creative.length,
    creativeMinutes: creative.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
  };
}

export function exerciseProgress(
  sessions: ExerciseProgressSession[],
  exerciseId: string,
): Array<{ localDate: string; sets: number | null; reps: number | null }> {
  return sessions
    .filter((session) => session.status === "COMPLETED")
    .flatMap((session) => session.results
      .filter((result) => result.exerciseId === exerciseId && (result.sets !== null || result.reps !== null))
      .map((result) => ({ localDate: session.localDate, sets: result.sets, reps: result.reps })))
    .toSorted((left, right) => right.localDate.localeCompare(left.localDate));
}
