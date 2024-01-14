import { Task } from "@prisma/client";
import { Todo } from "utils/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TodoState {
  id: string;
  priority: boolean;
  tasks: { title: string }[];
  frequency: string;
  todoTitle: string;
  date: Date;
  setPriority: () => void;
  setId: (input: string) => void;
  setTasks: (input: { title: string }[]) => void;
  setFrequency: (input: string) => void;
  setTodoTitle: (input: string) => void;
  setDate: (input: Date) => void;
  setRepeatable: () => void;
  setTimed: () => void;
  addTask: () => void;
  updateTask: (input: { e: any; i: number }) => void;
  deleteTask: (input: number) => void;
  importItem: (input: Todo) => void;
  reset: () => void;
}

const initialState = {
  id: "",
  priority: false,
  tasks: [],
  frequency: null,
  todoTitle: "",
  date: null,
};
export const useTodoStore = create<TodoState>()(
  //persist(
  (set, get) => ({
    ...initialState,
    setId: (input) => set({ id: input }),
    setTasks: (input) => set({ tasks: input }),
    setFrequency: (input) => set({ frequency: input }),
    setTodoTitle: (input) => set({ todoTitle: input }),
    setDate: (input) => set({ date: input }),
    setPriority: () => set({ priority: !get().priority }),
    setRepeatable: () => set({ frequency: get().frequency != null ? null : "Daily" }),
    setTimed: () => set({ date: get().date != null ? null : new Date(new Date().setHours(0, 0, 0, 0)) }),
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
          console.log(currentTasks);
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
    importItem: (input) =>
      set({
        id: input.id,
        priority: input.priority,
        tasks: input.tasks,
        frequency: input.frequency,
        todoTitle: input.title,
        date: input.nextShow,
      }),
    reset: () => set(initialState),
  }),
  //   ,
  //   {
  //     name: "todoStore",
  //   }
  // )
);
