"use client";
import { useEffect, useState } from "react";
import AddModal from "./AddModal";
import TodoItem from "./TodoItem";
import AddItemButton from "../utilityComponents/AddItemButton";
import { ScrollArea } from "../utilityComponents/scrollarea";
import { getToDos } from "./todoServer";
import { useAuth } from "@clerk/nextjs";

export default function TodoTabs() {
  const user = useAuth();
  const getUserTodos = async () => {
    const temp = await getToDos(user.userId);
    setQueryList(temp);
  };
  const [queryList, setQueryList] = useState({ todays: [], general: [], overall: [] });
  const [activeTab, setActiveTab] = useState(1);
  const [addingThings, setAddingThings] = useState(false);
  const toggleModal = () => {
    setAddingThings(!addingThings);
  };
  useEffect(() => {
    getUserTodos();
  }, []);
  return (
    <div className=" flex h-full w-full flex-col bg-neutral-400">
      {addingThings ? <AddModal toggle={toggleModal} updateList={getUserTodos} /> : null}
      <div className="flex h-1/5 w-full font-medium text-neutral-900">
        <div onClick={() => setActiveTab(1)} className={"flex h-full w-1/3 items-center justify-center text-6xl max-sm:text-2xl " + (activeTab === 1 ? "" : " bg-neutral-600")}>
          Today
        </div>
        <div
          onClick={() => setActiveTab(2)}
          className={"flex h-full w-1/3  items-center justify-center border-x-2  border-neutral-900 text-6xl max-sm:text-2xl " + (activeTab === 2 ? "" : " bg-neutral-600")}
        >
          General
        </div>
        <div
          onClick={() => setActiveTab(3)}
          className={"flex h-full w-1/3  items-center justify-center  border-neutral-900 text-6xl max-sm:text-2xl " + (activeTab === 3 ? "" : " bg-neutral-600")}
        >
          Overview
        </div>
      </div>
      <div className=" flex h-4/5 w-full overflow-hidden">
        <div className={"relative flex h-full w-full flex-col"}>
          <AddItemButton onClick={() => toggleModal()} />
          <ScrollArea className="mx-auto mb-4 flex h-full w-10/12 max-sm:w-11/12">
            {activeTab == 1
              ? queryList.todays.map((item) => <TodoItem item={item} key={item.id} updateList={getUserTodos} />)
              : activeTab == 2
              ? queryList.general.map((item) => <TodoItem item={item} key={item.id} updateList={getUserTodos} />)
              : queryList.overall.map((item) => <TodoItem item={item} key={item.id} updateList={getUserTodos} />)}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
