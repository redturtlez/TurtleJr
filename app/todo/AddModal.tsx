"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { useTodoStore } from "@/app/todo/todoStates";
import { type Todo, Todos, saveTodos } from "./todoServer";
import styles from "./todo.module.css";

export default function AddModal() {
  const todoStore = useTodoStore();
  const [saving, setSaving] = useState(false);
  const editing = todoStore.activeTodo !== -1;

  const save = async () => {
    if (!todoStore.title.trim()) { toast.error("Give the task a title"); return; }
    setSaving(true);
    try {
      const result = await saveTodos({ todos: todoStore.pushTodo() });
      if (typeof result === "string") toast.error(result);
      else { todoStore.setTodos(result?.todos as Todos); todoStore.resetTodo(); todoStore.flipModal(); toast.success(editing ? "Task updated" : "Task added"); }
    } catch { toast.error("Could not save the task"); }
    finally { setSaving(false); }
  };

  const dateValue = todoStore.nextShow ? new Date(todoStore.nextShow).toISOString().slice(0, 10) : "";
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) todoStore.flipModal(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="task-dialog-title">
        <header className={styles.modalHeader}><div><small>{editing ? "Update task" : "New task"}</small><h2 id="task-dialog-title">{editing ? "Refine the details" : "What needs doing?"}</h2></div><button type="button" className={styles.closeButton} onClick={() => todoStore.flipModal()} aria-label="Close"><X /></button></header>
        <div className={styles.modalBody}>
          <label className={styles.formField}><span>Title</span><input autoFocus value={todoStore.title} onChange={(event) => todoStore.setTitle(event.target.value)} placeholder="e.g. Send the revised proposal" /></label>
          <label className={styles.formField}><span>Details · one item per line</span><textarea value={(todoStore.tasks ?? []).join("\n")} onChange={(event) => todoStore.setTasks(event.target.value.split("\n"))} placeholder={"Add context or a short checklist\nReview final numbers\nSend to the team"} /></label>
          <div className={styles.settings}>
            <div className={styles.setting}><span className={styles.settingTitle}>Priority</span><div className={styles.priorityButtons}>{[1, 2, 3].map((priority) => <button type="button" key={priority} className={todoStore.priority === priority ? styles.selected : ""} onClick={() => todoStore.setPriority(priority)}>{priority === 1 ? "Low" : priority === 2 ? "Medium" : "High"}</button>)}</div></div>
            <div className={styles.setting}><span className={styles.settingTitle}>Schedule</span><label className={styles.settingRow}><span>Use a due date</span><input type="checkbox" checked={todoStore.timed} onChange={() => todoStore.flipTimed()} /></label></div>
          </div>
          {todoStore.timed ? <label className={styles.formField}><span>Due date</span><input type="date" value={dateValue} onChange={(event) => todoStore.setNextShow(new Date(`${event.target.value}T12:00:00`))} /></label> : null}
          {todoStore.timed ? <div className={styles.settings}><div className={styles.setting}><span className={styles.settingTitle}>Repeat</span><label className={styles.settingRow}><span>Recurring task</span><input type="checkbox" checked={todoStore.repeatable} onChange={() => todoStore.flipRepeatable()} /></label></div>{todoStore.repeatable ? <label className={styles.formField}><span>Frequency</span><select className={styles.select} value={todoStore.frequency ?? "Daily"} onChange={(event) => todoStore.setFrequency(event.target.value as NonNullable<Todo["frequency"]>)}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></label> : null}</div> : null}
        </div>
        <footer className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => todoStore.flipModal()}>Cancel</button><button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editing ? "Save changes" : "Add task"}</button></footer>
      </section>
    </div>
  );
}
