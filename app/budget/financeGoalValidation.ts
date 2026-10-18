import { z } from "zod";
import { parseUsdToCents } from "../../lib/finance/money.ts";
import { financeIdSchema } from "./financeValidation.ts";

const nonnegativeUsdSchema = z.string().trim().refine((value) => {
  try { return parseUsdToCents(value) >= BigInt(0); } catch { return false; }
}, "Enter zero or a positive amount with no more than two decimal places");

const positiveUsdSchema = z.string().trim().refine((value) => {
  try { return parseUsdToCents(value) > BigInt(0); } catch { return false; }
}, "Target must be greater than zero with no more than two decimal places");

export const financeGoalSchema = z.object({
  accountId: financeIdSchema,
  name: z.string().trim().min(1, "Name is required").max(100),
  kind: z.enum(["EMERGENCY", "PURCHASE", "GENERAL"]),
  target: positiveUsdSchema,
  allocation: nonnegativeUsdSchema,
  monthlyContribution: nonnegativeUsdSchema,
}).superRefine((value, context) => {
  try {
    if (parseUsdToCents(value.allocation) > parseUsdToCents(value.target)) context.addIssue({ code: "custom", message: "Allocation cannot exceed the target", path: ["allocation"] });
  } catch {
    // Field-level refinements report malformed money inputs.
  }
});

export const financeGoalUpdateSchema = financeGoalSchema.and(z.object({ id: financeIdSchema }));
