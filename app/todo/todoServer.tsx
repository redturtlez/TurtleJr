"use server";
import { Prisma } from "@prisma/client";
import { prisma } from "utils/database";
import z, { ZodError } from "zod";

export type userTodo = z.infer<typeof todoSchema>;
export type Todos = userTodo["todos"];
export type Todo = userTodo["todos"][0];
const todoSchema = z.object({
  userid: z.string(),
  todos: z.array(
    z.object({
      title: z.string().min(1),
      frequency: z.string().optional(),
      nextShow: z
        .union([z.string().pipe(z.coerce.date()), z.date()])
        .optional()
        .nullable(),
      priority: z.number().gte(1).lte(3),
      tasks: z.array(z.string()).optional(),
    }),
  ),
});

export async function getTodos(input) {
  z.string().safeParse(input);
  const output = await prisma.todo.findMany({
    where: { userid: input },
  });
  return output[0]?.todos as Todos;
}
export async function saveTodos(input) {
  const valid = todoSchema.safeParse(input);
  if (!valid.success) {
    return valid.error.issues[0]?.message;
  } else {
    const output = await prisma.todo.upsert({
      where: {
        userid: valid.data.userid,
      },
      update: {
        todos: valid.data.todos as Prisma.JsonArray,
      },
      create: {
        userid: valid.data.userid,
        todos: valid.data.todos as Prisma.JsonArray,
      },
    });
    return output as userTodo;
  }
}
export async function deleteTodos(input) {
  z.string().safeParse(input);
  const output = await prisma.todo.deleteMany({
    where: { userid: input },
  });
  return output;
}
