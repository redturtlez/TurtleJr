import { Task } from "@prisma/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TodoState {
  id: string;
  priority: boolean;
  tasks: Task[];
  frequency: string;
  todoTitle: string;
  date: Date;
  setPriority: () => void;
  setId: (input: string) => void;
  setTasks: (input: Task[]) => void;
  setFrequency: (input: string) => void;
  setTodoTitle: (input: string) => void;
  setDate: (input: Date) => void;
  setRepeatable: () => void;
  addTask: () => void;
  updateTask: (input: { e: any; i: number }) => void;
  deleteTask: (input: number) => void;
}
export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      id: "",
      priority: false,
      tasks: [],
      frequency: null,
      todoTitle: "",
      date: null,
      setId: (input) => set({ id: input }),
      setTasks: (input) => set({ tasks: input }),
      setFrequency: (input) => set({ frequency: input }),
      setTodoTitle: (input) => set({ todoTitle: input }),
      setDate: (input) => set({ date: input }),
      setPriority: () => set({ priority: !get().priority }),
      setRepeatable: () => set({ frequency: get().frequency != null ? null : "Daily" }),
      addTask: () => set({ tasks: [...get().tasks, { title: "" } as Task] }),
      updateTask: (input) =>
        set({
          tasks: (() => {
            const currentTasks = get().tasks;
            const currentTask = currentTasks[input.i];
            if (currentTask != undefined) {
              currentTask.title = input.e.target.value;
              currentTasks[input.i] = currentTask;
            }
            return currentTasks;
          })(),
        }),
      deleteTask: (input) =>
        set({
          tasks: (() => {
            const temp = [...get().tasks];
            temp.splice(input, 1);
            return temp;
          })(),
        }),
    }),
    {
      name: "todoStore",
    }
  )
);
