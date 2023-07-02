import { Task, ToDo } from "@prisma/client";

export type Todo = ToDo & { tasks: Task[] };
