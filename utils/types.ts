import { Task, ToDo } from "@prisma/client";

export type Todo = Prettify<ToDo & { tasks: Task[] }>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
