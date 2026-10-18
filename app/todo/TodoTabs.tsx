"use client";

import { CalendarDays, Inbox, ListChecks, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useTodoStore } from "@/app/todo/todoStates";
import AddModal from "./AddModal";
import TodoItem from "./TodoItem";
import { getTodos } from "./todoServer";
import styles from "./todo.module.css";

type Filter = "today" | "untimed" | "all";
const isToday = (value: Date | string | null | undefined) => {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
};

export default function TodoTabs() {
  const todoStore = useTodoStore();
  const setTodos = useTodoStore((state) => state.setTodos);
  const [filter, setFilter] = useState<Filter>("today");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getTodos().then((todos) => {
      if (!cancelled) setTodos(todos);
    }).catch(() => toast.error("Could not load your tasks")).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [setTodos]);

  const todos = useMemo(() => todoStore.todos ?? [], [todoStore.todos]);
  const counts = { today: todos.filter((item) => isToday(item.nextShow)).length, untimed: todos.filter((item) => !item.nextShow).length, all: todos.length };
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return todos.filter((item) => {
      const matchesFilter = filter === "all" || (filter === "today" ? isToday(item.nextShow) : !item.nextShow);
      const matchesQuery = !needle || item.title.toLowerCase().includes(needle) || item.tasks?.some((task) => task.toLowerCase().includes(needle));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, todos]);

  const openNewTask = () => { todoStore.resetTodo(); todoStore.flipModal(); };

  return (
    <main className={styles.page}>
      {todoStore.modal ? <AddModal /> : null}
      <header className={styles.header}><p>Personal workspace</p><div><h1>Tasks, <span>without the clutter.</span></h1><p className={styles.intro}>Plan what matters today, keep untimed ideas close, and manage repeating work from one focused list.</p></div></header>
      <section className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}><ListChecks aria-hidden="true" /><div><small>Overview</small><strong>{counts.all} total tasks</strong></div></div>
          <nav className={styles.filters} aria-label="Task filters">{(["today", "untimed", "all"] as Filter[]).map((value) => <button key={value} type="button" className={filter === value ? styles.activeFilter : ""} onClick={() => setFilter(value)}><span>{value === "today" ? "Today" : value === "untimed" ? "Untimed" : "All tasks"}</span><b>{counts[value]}</b></button>)}</nav>
          <div className={styles.sidebarNote}><CalendarDays aria-hidden="true" /><p><strong>Recurring tasks</strong><span>Daily, weekly, monthly, or yearly schedules stay attached to each task.</span></p></div>
        </aside>
        <div className={styles.taskPanel}>
          <div className={styles.toolbar}><div><small>{filter === "all" ? "Everything" : filter}</small><h2>{filter === "today" ? "Today’s focus" : filter === "untimed" ? "Anytime tasks" : "All tasks"}</h2></div><button type="button" className={styles.addButton} onClick={openNewTask}><Plus aria-hidden="true" />New task</button></div>
          <label className={styles.search}><Search aria-hidden="true" /><span className="sr-only">Search tasks</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks and details" /></label>
          <div className={styles.list} aria-live="polite">{loading ? <div className={styles.empty}>Loading your tasks…</div> : visible.length ? visible.map((item) => <TodoItem key={`${item.title}-${todos.indexOf(item)}`} item={item} id={todos.indexOf(item)} />) : <div className={styles.empty}><Inbox aria-hidden="true" /><strong>{query ? "No matching tasks" : "This list is clear"}</strong><span>{query ? "Try a different search." : "Add a task when you are ready."}</span></div>}</div>
        </div>
      </section>
    </main>
  );
}
