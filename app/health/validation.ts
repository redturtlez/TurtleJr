import { z } from "zod";

const minuteOfDay = z.number().int().min(0).max(1439);
const optionalDuration = z.number().int().min(1).max(720).nullable();

export const activitySchema = z.object({
  kind: z.enum(["ROUTINE", "HABIT"]),
  title: z.string().trim().min(1, "Give the activity a name").max(120),
  description: z.string().trim().max(500).nullable(),
  scheduleType: z.enum(["SEQUENTIAL", "FIXED_TIME", "FLEXIBLE_WINDOW"]),
  fixedTimeMinutes: minuteOfDay.nullable(),
  windowStartMinutes: minuteOfDay.nullable(),
  windowEndMinutes: minuteOfDay.nullable(),
  estimatedDurationMinutes: optionalDuration,
  minimumDurationMinutes: optionalDuration,
  preferredDurationMinutes: optionalDuration,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  importance: z.enum(["ESSENTIAL", "OPTIONAL"]),
  reminderEnabled: z.boolean(),
}).superRefine((value, context) => {
  if (new Set(value.daysOfWeek).size !== value.daysOfWeek.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["daysOfWeek"], message: "Choose each day only once" });
  }
  if (value.scheduleType === "FIXED_TIME" && value.fixedTimeMinutes === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["fixedTimeMinutes"], message: "Choose a fixed time" });
  }
  if (value.scheduleType === "FLEXIBLE_WINDOW") {
    if (value.windowStartMinutes === null || value.windowEndMinutes === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["windowStartMinutes"], message: "Choose a start and end time" });
    } else if (value.windowStartMinutes >= value.windowEndMinutes) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["windowEndMinutes"], message: "The window must end after it starts" });
    }
  }
  if (value.minimumDurationMinutes && value.preferredDurationMinutes && value.minimumDurationMinutes > value.preferredDurationMinutes) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["preferredDurationMinutes"], message: "Preferred duration must meet the minimum" });
  }
});

export const statusSchema = z.object({
  activityId: z.string().cuid(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["COMPLETED", "SNOOZED", "SKIPPED"]),
  durationMinutes: optionalDuration,
});

const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable();

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Give the goal a name").max(120),
  description: optionalText(1000),
  targetValue: z.number().finite().positive().max(1_000_000_000).nullable(),
  targetUnit: optionalText(40),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]),
  activityIds: z.array(z.string().cuid()).max(50),
}).superRefine((value, context) => {
  if (value.targetValue !== null && !value.targetUnit) context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetUnit"], message: "Add a unit for the numeric target" });
  if (new Set(value.activityIds).size !== value.activityIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["activityIds"], message: "Choose each habit once" });
});

export const goalProgressSchema = z.object({
  goalId: z.string().cuid(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number().finite().min(0).max(1_000_000_000).nullable(),
  note: optionalText(1000),
}).refine((value) => value.value !== null || Boolean(value.note), { message: "Add a measurement or note" });

export const recommendationFeedbackSchema = z.object({
  fingerprint: z.string().min(1).max(250),
  status: z.enum(["ACCEPTED", "DISMISSED", "SNOOZED"]),
});

const nullableNonnegative = z.number().finite().min(0).max(1_000_000).nullable();
export const weightEntrySchema = z.object({ localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), value: z.number().finite().positive().max(2000), unit: z.enum(["LB", "KG"]), note: optionalText(500) });
const foodTerms = z.array(z.string().trim().min(1).max(80)).max(50);
export const nutritionSettingsSchema = z.object({ weightUnit: z.enum(["LB", "KG"]), targetWeight: nullableNonnegative, calorieTarget: nullableNonnegative, proteinTarget: nullableNonnegative, carbsTarget: nullableNonnegative, fatTarget: nullableNonnegative, fiberTarget: nullableNonnegative, calciumTarget: nullableNonnegative, potassiumTarget: nullableNonnegative, magnesiumTarget: nullableNonnegative, ironTarget: nullableNonnegative, vitaminDTarget: nullableNonnegative, vitaminB12Target: nullableNonnegative, omega3Target: nullableNonnegative, avoidSeafood: z.boolean(), avoidMushrooms: z.boolean(), maxPrepMinutes: z.number().int().min(5).max(480), preferredComplexity: z.enum(["SIMPLE", "MODERATE", "INVOLVED"]), ageYears: z.number().int().min(18).max(120).nullable(), heightInches: z.number().finite().min(36).max(108).nullable(), energyEquationSex: z.enum(["MALE", "FEMALE"]).nullable(), activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE"]).nullable(), resistanceTraining: z.boolean().nullable(), targetWeeklyLossPounds: z.number().finite().min(0.25).max(2).nullable(), preferredFoods: foodTerms, acceptableFoods: foodTerms, avoidedFoods: foodTerms });
export const foodSchema = z.object({ name: z.string().trim().min(1).max(160), brand: optionalText(120), servingLabel: z.string().trim().min(1).max(80), servingGrams: nullableNonnegative, calories: nullableNonnegative, protein: nullableNonnegative, carbs: nullableNonnegative, fat: nullableNonnegative, fiber: nullableNonnegative, water: nullableNonnegative, calcium: nullableNonnegative, potassium: nullableNonnegative, magnesium: nullableNonnegative, iron: nullableNonnegative, vitaminD: nullableNonnegative, vitaminB12: nullableNonnegative, omega3: nullableNonnegative, dataQuality: z.enum(["KNOWN", "ESTIMATED"]) });
export const foodLogSchema = z.object({ foodId: z.string().cuid(), localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), mealSlot: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]), quantity: z.number().finite().positive().max(100) });
export const foodLogUpdateSchema = foodLogSchema.omit({ foodId: true }).extend({ id: z.string().cuid() });
export const mealSchema = z.object({ name: z.string().trim().min(1).max(120), pinned: z.boolean(), defaultMealSlot: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).nullable(), items: z.array(z.object({ foodId: z.string().cuid(), quantity: z.number().finite().positive().max(100) })).min(1).max(30) });
export const mealLogSchema = z.object({ mealId: z.string().cuid(), localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), mealSlot: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]), quantity: z.number().finite().positive().max(20) });
export const nutritionFeedbackSchema = z.object({ targetType: z.enum(["FOOD", "MEAL", "RECIPE"]), targetId: z.string().cuid(), fullness: z.number().int().min(1).max(5).nullable(), enjoyment: z.number().int().min(1).max(5).nullable(), convenience: z.number().int().min(1).max(5).nullable(), eatAgain: z.boolean().nullable() }).refine((value) => value.fullness !== null || value.enjoyment !== null || value.convenience !== null || value.eatAgain !== null, { message: "Add at least one rating" });
export const recipeSchema = z.object({ name: z.string().trim().min(1).max(140), instructions: z.string().trim().min(1).max(5000), tags: z.array(z.string().trim().min(1).max(40)).max(20), servings: z.number().int().min(1).max(100), prepMinutes: z.number().int().min(1).max(1440).nullable(), complexity: z.enum(["SIMPLE", "MODERATE", "INVOLVED"]), ingredients: z.array(z.object({ foodId: z.string().cuid(), quantity: z.number().finite().positive().max(1000) })).min(1).max(100) });
export const mealPlanSchema = z.object({ localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), mealSlot: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]), recipeId: z.string().cuid(), servings: z.number().finite().positive().max(20) });
export const groceryStateSchema = z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), foodId: z.string().cuid(), inPantry: z.boolean(), purchased: z.boolean() });

const linkedActivityId = z.string().cuid().nullable();
export const workoutPlanSchema = z.object({
  name: z.string().trim().min(1).max(140),
  description: optionalText(1000),
  estimatedDurationMinutes: optionalDuration,
  activityId: linkedActivityId,
  exercises: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    targetSets: z.number().int().min(1).max(100).nullable(),
    targetReps: z.number().int().min(1).max(10_000).nullable(),
  })).min(1).max(50),
}).superRefine((value, context) => {
  const normalized = value.exercises.map((exercise) => exercise.name.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["exercises"], message: "Use each exercise name once per plan" });
});

export const workoutSessionSchema = z.object({
  planId: z.string().cuid(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["COMPLETED", "SKIPPED"]),
  durationMinutes: optionalDuration,
  note: optionalText(1000),
  results: z.array(z.object({ exerciseId: z.string().cuid(), sets: z.number().int().min(1).max(100).nullable(), reps: z.number().int().min(1).max(10_000).nullable() })).max(50),
});

export const creativeProjectSchema = z.object({
  name: z.string().trim().min(1).max(140),
  description: optionalText(1000),
  status: z.enum(["PLANNED", "IN_PROGRESS", "PAUSED", "COMPLETED"]),
  activityId: linkedActivityId,
});
export const creativeProjectStatusSchema = z.object({ id: z.string().cuid(), status: z.enum(["PLANNED", "IN_PROGRESS", "PAUSED", "COMPLETED"]) });
export const creativeSessionSchema = z.object({
  projectId: z.string().cuid().nullable(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityType: z.string().trim().min(1).max(80),
  durationMinutes: optionalDuration,
  note: optionalText(2000),
});

export const notificationSettingsSchema = z.object({
  dailyDigestEnabled: z.boolean(),
  dailyDigestMinutes: minuteOfDay,
  activityPushRemindersEnabled: z.boolean(),
  inAppRemindersEnabled: z.boolean(),
  quietStartMinutes: minuteOfDay.nullable(),
  quietEndMinutes: minuteOfDay.nullable(),
  showActivityNames: z.boolean(),
}).superRefine((value, context) => {
  const hasStart = value.quietStartMinutes !== null;
  const hasEnd = value.quietEndMinutes !== null;
  if (hasStart !== hasEnd) context.addIssue({ code: z.ZodIssueCode.custom, path: ["quietStartMinutes"], message: "Choose both quiet-hour times or leave both blank" });
  if (hasStart && value.quietStartMinutes === value.quietEndMinutes) context.addIssue({ code: z.ZodIssueCode.custom, path: ["quietEndMinutes"], message: "Quiet hours need different start and end times" });
});

const pushKey = z.string().min(8).max(512).regex(/^[A-Za-z0-9_-]+$/, "Invalid push key");
function isKnownPushService(value: string): boolean {
  const hostname = new URL(value).hostname.toLocaleLowerCase();
  return hostname === "fcm.googleapis.com"
    || hostname === "web.push.apple.com"
    || hostname.endsWith(".push.services.mozilla.com")
    || hostname.endsWith(".notify.windows.com");
}
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Push endpoint must use HTTPS").refine(isKnownPushService, "Unsupported push service"),
  expirationTime: z.number().finite().positive().max(8_640_000_000_000_000).nullable(),
  keys: z.object({ p256dh: pushKey, auth: pushKey }),
  userAgent: z.string().trim().max(500).nullable(),
});

export const pushEndpointSchema = pushSubscriptionSchema.shape.endpoint;
