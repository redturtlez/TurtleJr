import { z } from "zod";
import { parseUsdToCents } from "../../lib/finance/money.ts";
import { financeIdSchema, localDateSchema } from "./financeValidation.ts";

const positiveUsdSchema = z.string().trim().refine((value) => {
  try { return parseUsdToCents(value) > BigInt(0); } catch { return false; }
}, "Enter an amount greater than zero with no more than two decimal places");

export const planItemSchema = z.object({
  accountId: financeIdSchema,
  name: z.string().trim().min(1, "Name is required").max(100),
  kind: z.enum(["INCOME", "BILL", "ALLOWANCE"]),
  amount: positiveUsdSchema,
  category: z.string().trim().max(60).default(""),
  recurrence: z.enum(["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: localDateSchema,
  semimonthlyFirstDay: z.number().int().min(1).max(31).nullable().default(null),
  semimonthlySecondDay: z.number().int().min(1).max(31).nullable().default(null),
}).superRefine((value, context) => {
  if (value.recurrence === "SEMIMONTHLY") {
    if (value.semimonthlyFirstDay === null || value.semimonthlySecondDay === null) context.addIssue({ code: "custom", message: "Choose both twice-monthly days", path: ["semimonthlyFirstDay"] });
    if (value.semimonthlyFirstDay === value.semimonthlySecondDay) context.addIssue({ code: "custom", message: "Twice-monthly days must differ", path: ["semimonthlySecondDay"] });
  }
});

export const planItemUpdateSchema = planItemSchema.and(z.object({ id: financeIdSchema }));

export const transactionSchema = z.object({
  accountId: financeIdSchema,
  transferAccountId: financeIdSchema.nullable().default(null),
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: positiveUsdSchema,
  occurredOn: localDateSchema.refine((value) => value <= new Date().toISOString().slice(0, 10), "Transaction date cannot be in the future"),
  category: z.string().trim().max(60).default(""),
  note: z.string().trim().max(240).default(""),
}).superRefine((value, context) => {
  if (value.type === "TRANSFER" && !value.transferAccountId) context.addIssue({ code: "custom", message: "Choose a destination account", path: ["transferAccountId"] });
  if (value.type === "TRANSFER" && value.transferAccountId === value.accountId) context.addIssue({ code: "custom", message: "Transfer accounts must differ", path: ["transferAccountId"] });
  if (value.type !== "TRANSFER" && value.transferAccountId) context.addIssue({ code: "custom", message: "Only transfers can have a destination account", path: ["transferAccountId"] });
});

export const transactionUpdateSchema = transactionSchema.and(z.object({ id: financeIdSchema }));
