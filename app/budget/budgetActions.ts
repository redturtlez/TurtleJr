import { prisma } from "@/lib/database";
import * as z from "zod";

// Zod schema for validation (should match client formSchema)
export const budgetItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  amount: z.number(),
  type: z.enum(["expense", "income"]),
  frequency: z.enum(["one-time", "daily", "weekly", "monthly", "yearly"]).default("one-time"),
  date: z.union([z.date(), z.string()]).optional().nullable(),
  icon: z.string().min(1, "Icon is required"),
  subitems: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        amount: z.number(),
      }),
    )
    .optional(),
});

export const budgetItemsSchema = z.array(budgetItemSchema);

export async function getBudgetItems(userId: string) {
  const userBudget = await prisma.budget.findUnique({ where: { userid: userId } });
  return userBudget?.budgetItems || [];
}

export async function setBudgetItems(userId: string, items: unknown) {
  const parsed = budgetItemsSchema.safeParse(items);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid data");
  return await prisma.budget.upsert({
    where: { userid: userId },
    update: { budgetItems: parsed.data },
    create: { userid: userId, budgetItems: parsed.data },
  });
}

export async function addBudgetItem(userId: string, data: unknown) {
  const parsed = budgetItemSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid data");
  const userBudget = await prisma.budget.findUnique({ where: { userid: userId } });
  let items: any[] = [];
  if (Array.isArray(userBudget?.budgetItems)) {
    items = userBudget!.budgetItems as any[];
  }
  return await setBudgetItems(userId, [...items, parsed.data]);
}

export async function updateBudgetItem(userId: string, itemId: number, data: unknown) {
  const parsed = budgetItemSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid data");
  const userBudget = await prisma.budget.findUnique({ where: { userid: userId } });
  if (!userBudget) throw new Error("Budget not found");
  const updatedItems = (userBudget.budgetItems as any[]).map((item) => (item.id === itemId ? { ...item, ...parsed.data } : item));
  return await setBudgetItems(userId, updatedItems);
}

export async function deleteBudgetItem(userId: string, itemId: number) {
  const userBudget = await prisma.budget.findUnique({ where: { userid: userId } });
  if (!userBudget) throw new Error("Budget not found");
  const updatedItems = (userBudget.budgetItems as any[]).filter((item) => item.id !== itemId);
  return await setBudgetItems(userId, updatedItems);
}
