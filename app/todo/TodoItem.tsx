import { CalendarDays, Check, ChevronDown, Circle, Pencil, Repeat2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { useTodoStore } from "@/app/todo/todoStates";
import { Todo, Todos, saveTodos } from "./todoServer";
import styles from "./todo.module.css";

export default function TodoItem({ item, id }: { item: Todo; id: number }) {
  const todoStore = useTodoStore();
  const [expanded, setExpanded] = useState(false);
  const [complete, setComplete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const details = item.tasks?.filter(Boolean) ?? [];

  const deleteItem = async () => {
    setDeleting(true);
    const remaining = (todoStore.todos ?? []).filter((_, index) => index !== id);
    try {
      const saved = await saveTodos({ userid: todoStore.userid, todos: remaining });
      if (typeof saved === "string") toast.error(saved);
      else { todoStore.setTodos(saved?.todos as Todos); todoStore.resetTodo(); toast.success("Task deleted"); }
    } catch { toast.error("Could not delete the task"); }
    finally { setDeleting(false); }
  };

  const due = item.nextShow ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(item.nextShow)) : null;
  return (
    <article className={`${styles.taskCard} ${complete ? styles.complete : ""}`}>
      <button type="button" className={styles.completeButton} onClick={() => setComplete((value) => !value)} aria-label={complete ? "Mark task incomplete" : "Mark task complete"}>{complete ? <Check /> : <Circle />}</button>
      <div className={styles.taskBody}>
        <button type="button" className={styles.taskHeading} onClick={() => details.length && setExpanded((value) => !value)} aria-expanded={expanded}><strong>{item.title}</strong>{details.length ? <ChevronDown className={expanded ? styles.expanded : ""} /> : null}</button>
        <div className={styles.meta}><span className={styles[`priority${item.priority}`]}>{item.priority === 3 ? "High" : item.priority === 2 ? "Medium" : "Low"}</span>{due ? <span><CalendarDays />{due}</span> : <span>Anytime</span>}{item.frequency ? <span><Repeat2 />{item.frequency}</span> : null}</div>
        {expanded ? <ul className={styles.details}>{details.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}</ul> : null}
      </div>
      <div className={styles.actions}><button type="button" onClick={() => { todoStore.setActiveTodo(id); todoStore.flipModal(); }} aria-label={`Edit ${item.title}`}><Pencil /></button><button type="button" className={styles.danger} disabled={deleting} onClick={() => void deleteItem()} aria-label={`Delete ${item.title}`}><Trash2 /></button></div>
    </article>
  );
}
