import { z } from "zod";
import { parseUsdToCents } from "../../lib/finance/money.ts";

export const financeAccountTypeSchema = z.enum(["CHECKING", "SAVINGS"]);

export const financeAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(80, "Account name is too long"),
  type: financeAccountTypeSchema,
});

export const financeAccountUpdateSchema = financeAccountSchema.extend({ id: z.string().cuid() });

export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}, "Use a valid date");

export const balanceDateSchema = localDateSchema.refine(
  (value) => value <= new Date().toISOString().slice(0, 10),
  "Balance date cannot be in the future",
);

export const usdInputSchema = z.string().trim().min(1, "Balance is required").refine((value) => {
  try {
    parseUsdToCents(value);
    return true;
  } catch {
    return false;
  }
}, "Enter a dollar amount with no more than two decimal places");

export const balanceSnapshotSchema = z.object({
  accountId: z.string().cuid(),
  balance: usdInputSchema,
  asOfDate: balanceDateSchema,
  note: z.string().trim().max(240, "Note is too long").default(""),
});

export const balanceCorrectionSchema = balanceSnapshotSchema.omit({ accountId: true }).extend({
  snapshotId: z.string().cuid(),
});

export const financeIdSchema = z.string().cuid();
