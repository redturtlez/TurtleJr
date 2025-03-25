import { create } from "zustand";
import TodoItem from "app/todo/TodoItem";
import { Todo, Todos, userTodo } from "app/todo/todoServer";
import type { JSX } from "react";

type State = userTodo &
  Todo & {
    activeTodo: number;
    timed: boolean;
    repeatable: boolean;
    tasks: string[];
    tasksNew: string;
    nextShow: Date;
    today: Array<JSX.Element>;
    general: Array<JSX.Element>;
    overall: Array<JSX.Element>;
    modal: boolean;
  };

const initialState: State = {
  userid: "",
  todos: [],
  priority: 2,
  activeTodo: -1,
  title: "",
  tasks: [],
  tasksNew: "",
  timed: false,
  repeatable: false,
  nextShow: new Date(),
  frequency: "Daily",
  today: new Array(),
  general: new Array(),
  overall: new Array(),
  modal: false,
};

type Actions = {
  setUserId: (input: string) => void;
  setTodos: (input: Todos) => void;
  setPriority: (input: number | undefined) => void;
  setActiveTodo: (input: number) => void;
  setTitle: (input: string) => void;
  setTasks: (input: string[]) => void;
  flipTimed: () => void;
  flipRepeatable: () => void;
  setNextShow: (input: Date) => void;
  setFrequency: (input: string) => void;
  deleteTodo: (input: number) => void;
  addTask: () => void;
  deleteTask: (input: number) => void;
  updateTask: (val: string, index: number) => void;
  updateTaskNew: (val: string) => void;
  pushTodo: () => Todos;
  resetTodo: () => void;
  flipModal: () => void;
};

export const useTodoStore = create<State & Actions>()((set, get) => ({
  ...initialState,
  setUserId: (input) => {
    set({ userid: input });
  },
  flipModal: () => {
    set((state) => ({ modal: !state.modal }));
  },
  pushTodo: () => {
    //create todo, add to list and return it
    set((state) => ({
      todos: (() => {
        const tempTodo = {
          title: state.title,
          priority: state.priority,
          frequency: state.repeatable && state.timed ? state.frequency : undefined,
          nextShow: state.timed ? state.nextShow : undefined,
          tasks: state.tasks.filter((word) => word.length > 0),
        };
        if (state.activeTodo == -1) {
          const tempTodos = state.todos != undefined ? [...state.todos, tempTodo] : [tempTodo];
          return tempTodos;
        } else {
          const tempTodos = [...state.todos];
          tempTodos[state.activeTodo] = tempTodo;
          return tempTodos;
        }
      })(),
    }));
    return get().todos;
  },
  updateTask: (val, index) => {
    set((state) => ({
      tasks: (() => {
        const currentTasks = [...state.tasks];
        currentTasks[index] = val;
        return currentTasks;
      })(),
    }));
  },
  updateTaskNew: (val) => {
    set({ tasksNew: val });
  },
  deleteTask: (input) => {
    set((state) => ({ tasks: [...state.tasks.toSpliced(input, 1)] }));
  },
  addTask: () => {
    set((state) => ({ tasks: [...state.tasks, ""] }));
  },
  setTodos: (input) => {
    const temp = input != undefined ? input.toSorted((a, b) => b.priority - a.priority) : new Array<Todo>();

    set({ today: new Array(), general: new Array(), overall: new Array() });
    temp.map((item, i) => {
      if (item.nextShow == undefined) {
        set((state) => ({ general: state.general.concat(<TodoItem item={item} key={i} id={i} />) }));
      } else {
        let itemdate = new Date(new Date(item.nextShow).setHours(0, 0, 0, 0));
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        if (itemdate.getTime() < today.getTime() && item.frequency != undefined) {
          switch (item.frequency) {
            case "Daily":
              item.nextShow = today;
              break;
            case "Weekly":
              item.nextShow = new Date(itemdate.setDate(itemdate.getDate() + 7));
              break;
            case "Monthly":
              item.nextShow = new Date(itemdate.setMonth(itemdate.getMonth() + 1));
              break;
            case "Yearly":
              item.nextShow = new Date(itemdate.setFullYear(itemdate.getFullYear() + 1));
              break;
            default:
              break;
          }
          itemdate = item.nextShow;
        }

        if (itemdate.getTime() == today.getTime()) {
          set((state) => ({ today: state.today.concat(<TodoItem item={item} key={i} id={i} />) }));
          //else if date is less than today AND repeatable, update date
        }
      }

      set((state) => ({ overall: state.overall.concat(<TodoItem item={item} key={i} id={i} />) }));
    });
    set({ todos: temp });
  },
  setPriority: (input) => {
    set({ priority: input });
  },
  setActiveTodo: (input) => {
    set((state) => ({
      activeTodo: input,
      priority: state.todos[input]?.priority,
      title: state.todos[input]?.title,
      tasks: state.todos[input]?.tasks,
      timed: state.todos[input]?.nextShow != undefined && state.todos[input]?.nextShow != null,
      repeatable: state.todos[input]?.frequency != undefined && state.todos[input]?.frequency != null,
      nextShow: state.todos[input]?.nextShow != null ? new Date(state.todos[input]?.nextShow as Date) : new Date(),
      frequency: state.todos[input]?.frequency,
    }));
  },
  setTitle: (input) => {
    set({ title: input });
  },
  setTasks: (input) => {
    set({ tasks: input });
  },
  flipTimed: () => {
    set((state) => ({ timed: !state.timed, repeatable: !state.timed ? state.repeatable : false }));
  },
  flipRepeatable: () => {
    set((state) => ({ repeatable: !state.repeatable }));
  },
  setNextShow: (input) => {
    set({ nextShow: input });
  },
  setFrequency: (input) => {
    set({ frequency: input });
  },
  deleteTodo: (input) => {
    set((state) => ({ todos: { ...state.todos.splice(input, 1) } }));
  },
  resetTodo: () =>
    set({
      priority: initialState.priority,
      activeTodo: initialState.activeTodo,
      title: initialState.title,
      tasks: initialState.tasks,
      timed: initialState.timed,
      repeatable: initialState.repeatable,
      nextShow: initialState.nextShow,
      frequency: initialState.frequency,
    }),
}));
