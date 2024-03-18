"use client";
import { useEffect, useState } from "react";
import AddModal from "./AddModal";
import { ScrollArea } from "../_utilityComponents/scrollarea";
import { getTodos } from "./todoServer";
import { useAuth } from "@clerk/nextjs";
import { useTodoStore } from "./todoStates";

export default function TodoTabs() {
  const user = useAuth();
  const todoStore = useTodoStore();
  const init = async () => {
    todoStore.setTodos(await getTodos(user.userId));
    todoStore.setUserId(String(user.userId));
  };
  const [activeTab, setActiveTab] = useState(1);
  useEffect(() => {
    init();
  }, []);
  return (
    <div className=" animate__animated animate__fadeIn flex h-full w-full flex-col">
      {todoStore.modal ? <AddModal /> : null}
      <div className=" mx-auto mb-2 text-4xl font-extrabold text-text">Tasks</div>
      <div className="flex h-14 w-72 justify-evenly self-center rounded-full bg-secondary py-2 text-lg my-2">
        <div
          className={"self-center rounded-full px-4 py-1 font-semibold   " + (activeTab === 1 ? "bg-accent/80 font-semibold text-text  " : "text-accent")}
          onClick={() => setActiveTab(1)}
        >
          <p className="m-auto">Today</p>
        </div>
        <div
          className={"self-center rounded-full px-4 py-1 font-semibold   " + (activeTab === 2 ? "bg-accent/80 font-semibold text-text  " : "text-accent")}
          onClick={() => setActiveTab(2)}
        >
          <p className="m-auto">Untimed</p>
        </div>
        <div
          className={"self-center rounded-full px-4 py-1 font-semibold   " + (activeTab === 3 ? "bg-accent/80 font-semibold text-text  " : "text-accent")}
          onClick={() => setActiveTab(3)}
        >
          <p className="m-auto">All</p>
        </div>
      </div>

      <ScrollArea className="mx-auto w-11/12 max-h-[58vh]">{activeTab == 1 ? todoStore.today : activeTab == 2 ? todoStore.general : todoStore.overall}</ScrollArea>
      <div
        className="flex m-4 mt-auto h-16 w-11/12 items-center justify-center rounded-lg bg-accent/80 hover:bg-accent/70 "
        onClick={() => {
          todoStore.resetTodo();
          todoStore.flipModal();
        }}
      >
        Add New Task
      </div>
    </div>
  );
}
