"use server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database";
import { auth } from "@clerk/nextjs/server";
import z from "zod";

export type userBudget = z.infer<typeof budgetSchema>;
export type BudgetItems = userBudget["budgetItems"];
export type BudgetItem = z.infer<typeof itemSchema>;

const itemSchema = z.object({
  name: z.string(),
  id: z.number(),
  amount: z.number(),
  category: z.string().optional(),
  frequency: z.string().optional(),
  date: z
    .union([z.string().pipe(z.coerce.date()), z.date()])
    .optional()
    .nullable(),
  icon: z.string(),
  type: z.enum(["expense", "income"]),
  subitems: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number(),
      }),
    )
    .optional(),
});
const budgetSchema = z.object({
  userid: z.string(),
  budgetItems: z.array(itemSchema),
});

async function authenticatedUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to manage a budget");
  return userId;
}

export async function getBudgets() {
  const userId = await authenticatedUserId();
  const output = await prisma.budget.findMany({
    where: { userid: userId },
  });
  return output[0]?.budgetItems as BudgetItems;
}
export async function saveBudgets(input) {
  const userId = await authenticatedUserId();
  const valid = budgetSchema.pick({ budgetItems: true }).safeParse(input);
  if (!valid.success) {
    return valid.error.issues[0]?.message;
  } else {
    const output = await prisma.budget.upsert({
      where: {
        userid: userId,
      },
      update: {
        budgetItems: valid.data.budgetItems as Prisma.JsonArray,
      },
      create: {
        userid: userId,
        budgetItems: valid.data.budgetItems as Prisma.JsonArray,
      },
    });
    return output as userBudget;
  }
}
export async function deleteBudgets() {
  const userId = await authenticatedUserId();
  const output = await prisma.budget.deleteMany({
    where: { userid: userId },
  });
  return output;
}
