"use client";
import { useEffect, useState } from "react";
import AddModal from "./AddModal";
import TodoItem from "./TodoItem";
import AddItemButton from "../_utilityComponents/AddItemButton";
import { ScrollArea } from "../_utilityComponents/scrollarea";
import { getToDos } from "./todoServer";
import { useAuth } from "@clerk/nextjs";

export default function TodoTabs() {
  const user = useAuth();
  const getUserTodos = async () => {
    setAddingThings(false);
    const temp = await getToDos(user.userId);
    setQueryList(temp);
  };
  const [queryList, setQueryList] = useState({ todays: [], general: [], overall: [] });
  const [activeTab, setActiveTab] = useState(1);
  const [addingThings, setAddingThings] = useState(false);
  const toggleModal = () => {
    setAddingThings(false);
  };
  useEffect(() => {
    getUserTodos();
  }, []);
  return (
    <div className=" animate__animated animate__fadeIn flex h-full w-full flex-col">
      {addingThings ? <AddModal toggle={toggleModal} updateList={getUserTodos} /> : null}
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

      <ScrollArea className="mx-auto  w-11/12 h-[58vh]">
        {activeTab == 1
          ? queryList.todays.map((item) => <TodoItem item={item} key={item.id + "1"} updateList={getUserTodos} />)
          : activeTab == 2
            ? queryList.general.map((item) => <TodoItem item={item} key={item.id + "2"} updateList={getUserTodos} />)
            : queryList.overall.map((item) => <TodoItem item={item} key={item.id + "3"} updateList={getUserTodos} />)}
      </ScrollArea>
      <div className="flex m-auto h-16 w-11/12 items-center justify-center rounded-lg bg-accent/80 hover:bg-accent/70 ">Add New Task</div>
    </div>
  );
}
