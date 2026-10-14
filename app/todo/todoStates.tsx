import { create } from "zustand";
import { Todo, Todos, userTodo } from "app/todo/todoServer";

type State = userTodo &
  Todo & {
    activeTodo: number;
    timed: boolean;
    repeatable: boolean;
    tasks: string[];
    tasksNew: string;
    nextShow: Date;
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
    const sorted = input != undefined ? input.toSorted((a, b) => b.priority - a.priority) : [];
    set({ todos: sorted });
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
      tasksNew: initialState.tasksNew,
    }),
}));
