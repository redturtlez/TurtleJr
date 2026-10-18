"use server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database";
import z from "zod";

export type UserTodo = { todos: Todos };
export type Todos = z.infer<typeof todosSchema>;
export type Todo = Todos[number];
const todosSchema = z.array(
  z.object({
    title: z.string().trim().min(1).max(160),
    frequency: z.enum(["Daily", "Weekly", "Monthly", "Yearly"]).optional(),
    nextShow: z.union([z.string().pipe(z.coerce.date()), z.date()]).optional().nullable(),
    priority: z.number().int().gte(1).lte(3),
    tasks: z.array(z.string().trim().max(500)).max(50).optional(),
  }),
).max(500);
const todoSchema = z.object({
  todos: todosSchema,
});

async function authenticatedUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to manage tasks");
  return userId;
}

export async function getTodos(): Promise<Todos> {
  const userId = await authenticatedUserId();
  try {
    const output = await prisma.todo.findUnique({ where: { userid: userId } });
    const parsed = todosSchema.safeParse(output?.todos ?? []);
    return parsed.success ? parsed.data : [];
  } catch {
    throw new Error("Could not load tasks");
  }
}

export async function saveTodos(input: unknown): Promise<UserTodo | string> {
  const userId = await authenticatedUserId();
  const valid = todoSchema.safeParse(input);
  if (!valid.success) {
    return valid.error.issues[0]?.message ?? "Invalid task data";
  } else {
    try {
      await prisma.todo.upsert({
        where: { userid: userId },
        update: { todos: valid.data.todos as Prisma.JsonArray },
        create: { userid: userId, todos: valid.data.todos as Prisma.JsonArray },
      });
      return { todos: valid.data.todos };
    } catch {
      return "Could not save tasks";
    }
  }
}

export async function deleteTodos(): Promise<Prisma.BatchPayload> {
  const userId = await authenticatedUserId();
  try {
    return await prisma.todo.deleteMany({ where: { userid: userId } });
  } catch {
    throw new Error("Could not delete tasks");
  }
}
