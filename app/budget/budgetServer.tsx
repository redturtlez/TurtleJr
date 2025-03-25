"use server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database";
import z, { ZodError } from "zod";

export type userBudget = z.infer<typeof budgetSchema>;
export type BudgetItems = userBudget["budgetItems"];
export type BudgetItem = z.infer<typeof itemSchema>;

const itemSchema = z.object({
  name: z.string(),
  amount: z.number(),
});
const budgetSchema = z.object({
  userid: z.string(),
  budgetItems: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      frequency: z.string().optional(),
      date: z
        .union([z.string().pipe(z.coerce.date()), z.date()])
        .optional()
        .nullable(),
      icon: z.string(),
      subitems: z
        .array(
          z.object({
            name: z.string(),
            amount: z.number(),
          }),
        )
        .optional(),
    }),
  ),
});

export async function getBudgets(input) {
  z.string().safeParse(input);
  const output = await prisma.budget.findMany({
    where: { userid: input },
  });
  return output[0]?.budgetItems as BudgetItems;
}
export async function saveBudgets(input) {
  const valid = budgetSchema.safeParse(input);
  if (!valid.success) {
    return valid.error.issues[0]?.message;
  } else {
    const output = await prisma.budget.upsert({
      where: {
        userid: valid.data.userid,
      },
      update: {
        budgetItems: valid.data.budgetItems as Prisma.JsonArray,
      },
      create: {
        userid: valid.data.userid,
        budgetItems: valid.data.budgetItems as Prisma.JsonArray,
      },
    });
    return output as userBudget;
  }
}
export async function deleteBudgets(input) {
  z.string().safeParse(input);
  const output = await prisma.budget.deleteMany({
    where: { userid: input },
  });
  return output;
}
