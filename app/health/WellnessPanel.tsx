"use client";

import { Clock3, Dumbbell, Link2, Palette, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import type { WellnessDashboardData } from "./wellnessData";
import { createCreativeProject, createWorkoutPlan, logCreativeSession, logWorkoutSession, updateCreativeProjectStatus } from "./wellnessActions";
import styles from "./health.module.css";

type ExerciseDraft = { name: string; targetSets: string; targetReps: string };
const blankExercise = (): ExerciseDraft => ({ name: "", targetSets: "", targetReps: "" });
const optionalNumber = (value: FormDataEntryValue | null): number | null => String(value ?? "").trim() ? Number(value) : null;
const statusLabel = (status: WellnessDashboardData["creativeProjects"][number]["status"]): string => status.replace("_", " ").toLocaleLowerCase();

export default function WellnessPanel({ data, localDate }: { data: WellnessDashboardData; localDate: string }) {
  const [pending, startTransition] = useTransition();
  const [exercises, setExercises] = useState<ExerciseDraft[]>([blankExercise()]);
  const run = (work: () => Promise<unknown>, message: string): void => startTransition(async () => {
    try { await work(); toast.success(message); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Activity update failed"); }
  });
  const updateExercise = (index: number, key: keyof ExerciseDraft, value: string): void => setExercises((current) => current.map((exercise, position) => position === index ? { ...exercise, [key]: value } : exercise));

  return <section className={styles.wellnessPage}>
    <div className={styles.sectionLead}><small>Exercise and creative practice</small><h2>Make progress visible.</h2><p>Log lightweight workout and creative sessions. Optional routine links keep the Today view in sync without replacing detailed session history.</p></div>
    <section className={styles.wellnessSummary} aria-label="Seven-day activity summary">
      <article><Dumbbell /><span>Workouts</span><strong>{data.summary.workoutCount}</strong><small>{data.summary.workoutMinutes} minutes this week</small></article>
      <article><Palette /><span>Creative sessions</span><strong>{data.summary.creativeCount}</strong><small>{data.summary.creativeMinutes} minutes this week</small></article>
    </section>
    <div className={styles.wellnessGrid}>
      <div className={styles.wellnessColumn}>
        <article className={styles.nutritionCard}>
          <div className={styles.panelHeading}><div><small>Repeatable plans</small><h2>Workouts</h2></div><Dumbbell /></div>
          <div className={styles.workoutList}>{data.workoutPlans.map((plan) => <details key={plan.id}>
            <summary><span><strong>{plan.name}</strong><small>{plan.estimatedDurationMinutes ? `${plan.estimatedDurationMinutes} min` : "Flexible duration"}{plan.linkedActivity ? ` · Linked to ${plan.linkedActivity.title}` : ""}</small></span><em>{plan.sessions.filter((session) => session.status === "COMPLETED").length} completed</em></summary>
            {plan.description ? <p>{plan.description}</p> : null}
            <div className={styles.exerciseList}>{plan.exercises.map((exercise) => <div key={exercise.id}><span><b>{exercise.name}</b><small>{exercise.targetSets || exercise.targetReps ? `${exercise.targetSets ?? "—"} sets × ${exercise.targetReps ?? "—"} reps` : "No set/rep target"}</small></span><small>{exercise.progress.length ? exercise.progress.map((entry) => `${entry.localDate}: ${entry.sets ?? "—"} × ${entry.reps ?? "—"}`).join(" · ") : "No progression yet"}</small></div>)}</div>
            <div className={styles.workoutHistory}>{plan.sessions.slice(0, 5).map((session) => <div key={session.id}><b>{session.localDate}</b><span>{session.status.toLocaleLowerCase()}{session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}{session.note ? ` · ${session.note}` : ""}</span></div>)}</div>
            <form className={styles.compactForm} action={(form) => run(() => logWorkoutSession({ planId: plan.id, localDate: String(form.get("date")), status: String(form.get("status")), durationMinutes: optionalNumber(form.get("duration")), note: String(form.get("note") ?? "").trim() || null, results: plan.exercises.map((exercise) => ({ exerciseId: exercise.id, sets: optionalNumber(form.get(`sets-${exercise.id}`)), reps: optionalNumber(form.get(`reps-${exercise.id}`)) })) }), "Workout session saved")}>
              <div className={styles.twoColumns}><label><span>Date</span><input name="date" type="date" defaultValue={localDate} required /></label><label><span>Status</span><select name="status"><option value="COMPLETED">Completed</option><option value="SKIPPED">Skipped</option></select></label></div>
              <label><span>Duration, minutes</span><input name="duration" type="number" min="1" max="720" defaultValue={plan.estimatedDurationMinutes ?? undefined} /></label>
              <fieldset><legend>Completed sets and repetitions</legend>{plan.exercises.map((exercise) => <div className={styles.resultRow} key={exercise.id}><strong>{exercise.name}</strong><input aria-label={`${exercise.name} completed sets`} name={`sets-${exercise.id}`} type="number" min="1" max="100" placeholder="sets" /><input aria-label={`${exercise.name} completed repetitions`} name={`reps-${exercise.id}`} type="number" min="1" max="10000" placeholder="reps" /></div>)}</fieldset>
              <label><span>Session note</span><textarea name="note" maxLength={1000} /></label><button disabled={pending}>Save session</button>
            </form>
          </details>)}{!data.workoutPlans.length ? <p className={styles.emptyCopy}>Create a workout plan to begin tracking sessions.</p> : null}</div>
        </article>
        <article className={styles.nutritionCard}>
          <div className={styles.panelHeading}><div><small>Lightweight structure</small><h2>Create workout plan</h2></div><Plus /></div>
          <form className={styles.compactForm} action={(form) => run(() => createWorkoutPlan({ name: String(form.get("name")), description: String(form.get("description") ?? "").trim() || null, estimatedDurationMinutes: optionalNumber(form.get("duration")), activityId: String(form.get("activityId") ?? "") || null, exercises: exercises.map((exercise) => ({ name: exercise.name, targetSets: exercise.targetSets ? Number(exercise.targetSets) : null, targetReps: exercise.targetReps ? Number(exercise.targetReps) : null })) }), "Workout plan created")}>
            <label><span>Plan name</span><input name="name" required maxLength={140} /></label><label><span>Description</span><textarea name="description" maxLength={1000} /></label>
            <div className={styles.twoColumns}><label><span>Estimated minutes</span><input name="duration" type="number" min="1" max="720" /></label><label><span>Routine link</span><select name="activityId"><option value="">No link</option>{data.activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label></div>
            <fieldset><legend>Exercises</legend>{exercises.map((exercise, index) => <div className={styles.exerciseDraft} key={index}><input aria-label={`Exercise ${index + 1} name`} value={exercise.name} onChange={(event) => updateExercise(index, "name", event.target.value)} required placeholder="Exercise name" /><input aria-label={`Exercise ${index + 1} target sets`} value={exercise.targetSets} onChange={(event) => updateExercise(index, "targetSets", event.target.value)} type="number" min="1" max="100" placeholder="sets" /><input aria-label={`Exercise ${index + 1} target repetitions`} value={exercise.targetReps} onChange={(event) => updateExercise(index, "targetReps", event.target.value)} type="number" min="1" max="10000" placeholder="reps" />{exercises.length > 1 ? <button type="button" aria-label={`Remove exercise ${index + 1}`} onClick={() => setExercises((current) => current.filter((_, position) => position !== index))}><Trash2 /></button> : null}</div>)}<button type="button" className={styles.secondaryButton} onClick={() => setExercises((current) => [...current, blankExercise()])}><Plus />Add exercise</button></fieldset>
            <button disabled={pending}>Create plan</button>
          </form>
        </article>
      </div>
      <div className={styles.wellnessColumn}>
        <article className={styles.nutritionCard}>
          <div className={styles.panelHeading}><div><small>Projects and hobbies</small><h2>Creative work</h2></div><Palette /></div>
          <div className={styles.projectList}>{data.creativeProjects.map((project) => <article key={project.id}><div><strong>{project.name}</strong><small>{project.sessionCount} sessions · {project.totalMinutes} minutes{project.linkedActivity ? ` · ${project.linkedActivity.title}` : ""}</small>{project.description ? <p>{project.description}</p> : null}</div><select aria-label={`${project.name} status`} value={project.status} onChange={(event) => run(() => updateCreativeProjectStatus({ id: project.id, status: event.target.value }), "Project status updated")} disabled={pending}><option value="PLANNED">Planned</option><option value="IN_PROGRESS">In progress</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option></select></article>)}{!data.creativeProjects.length ? <p className={styles.emptyCopy}>Create a project, or log an unassociated creative session below.</p> : null}</div>
          <form className={styles.compactForm} action={(form) => run(() => logCreativeSession({ projectId: String(form.get("projectId") ?? "") || null, localDate: String(form.get("date")), activityType: String(form.get("activityType")), durationMinutes: optionalNumber(form.get("duration")), note: String(form.get("note") ?? "").trim() || null }), "Creative session saved")}>
            <div className={styles.twoColumns}><label><span>Date</span><input name="date" type="date" defaultValue={localDate} required /></label><label><span>Activity</span><input name="activityType" placeholder="Painting, drawing, 3D printing" required maxLength={80} /></label></div>
            <label><span>Project</span><select name="projectId"><option value="">No project</option>{data.creativeProjects.map((project) => <option key={project.id} value={project.id}>{project.name} · {statusLabel(project.status)}</option>)}</select></label>
            <label><span>Duration, minutes</span><input name="duration" type="number" min="1" max="720" /></label><label><span>Progress note</span><textarea name="note" maxLength={2000} /></label><button disabled={pending}>Log creative session</button>
          </form>
          <div className={styles.sessionHistory}>{data.creativeSessions.slice(0, 8).map((session) => <div key={session.id}><Clock3 /><span><strong>{session.activityType}{session.projectName ? ` · ${session.projectName}` : ""}</strong><small>{session.localDate}{session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}</small>{session.note ? <p>{session.note}</p> : null}</span></div>)}</div>
        </article>
        <article className={styles.nutritionCard}>
          <div className={styles.panelHeading}><div><small>Visible progress</small><h2>Create creative project</h2></div><Link2 /></div>
          <form className={styles.compactForm} action={(form) => run(() => createCreativeProject({ name: String(form.get("name")), description: String(form.get("description") ?? "").trim() || null, status: String(form.get("status")), activityId: String(form.get("activityId") ?? "") || null }), "Creative project created")}>
            <label><span>Project name</span><input name="name" required maxLength={140} /></label><label><span>Description</span><textarea name="description" maxLength={1000} /></label><div className={styles.twoColumns}><label><span>Status</span><select name="status"><option value="IN_PROGRESS">In progress</option><option value="PLANNED">Planned</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option></select></label><label><span>Routine link</span><select name="activityId"><option value="">No link</option>{data.activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label></div><button disabled={pending}>Create project</button>
          </form>
        </article>
      </div>
    </div>
  </section>;
}
