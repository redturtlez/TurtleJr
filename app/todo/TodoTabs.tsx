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
    <div className=" relative flex h-full w-full flex-col bg-slate-500">
      {addingThings ? <AddModal toggle={toggleModal} updateList={getUserTodos} /> : null}
      <div className="flex h-28 w-full font-medium text-neutral-900">
        <div className="m-auto flex h-16 w-11/12 rounded-full bg-neutral-800 md:w-6/12 ">
          <div className="m-auto flex h-16 w-11/12">
            <div
              className={
                "m-auto flex h-[70%] min-w-[28%] rounded-full   px-4  text-xl  " + (activeTab === 1 ? "bg-neutral-300 font-semibold text-neutral-800 " : "text-neutral-400")
              }
              onClick={() => setActiveTab(1)}
            >
              <p className="m-auto">Today</p>
            </div>
            <div
              className={"m-auto flex h-[70%] min-w-[32%] rounded-full px-4  text-xl  " + (activeTab === 2 ? "bg-neutral-300 font-semibold text-neutral-800" : "text-neutral-400")}
              onClick={() => setActiveTab(2)}
            >
              <p className="m-auto">Untimed</p>
            </div>
            <div
              className={
                "m-auto flex h-[70%] min-w-[23%] rounded-full  px-4   text-xl  " + (activeTab === 3 ? "bg-neutral-300 font-semibold text-neutral-800" : "text-neutral-400")
              }
              onClick={() => setActiveTab(3)}
            >
              <p className="m-auto">All</p>
            </div>
          </div>
        </div>
      </div>
      <AddItemButton onClick={() => toggleModal()} />
      <ScrollArea className="mx-auto mb-4 h-full w-11/12">
        {activeTab == 1
          ? queryList.todays.map((item) => <TodoItem item={item} key={item.id} updateList={getUserTodos} />)
          : activeTab == 2
          ? queryList.general.map((item) => <TodoItem item={item} key={item.id} updateList={getUserTodos} />)
          : queryList.overall.map((item) => <TodoItem item={item} key={item.id} updateList={getUserTodos} />)}
      </ScrollArea>
    </div>
  );
}
