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
      <div className=" mx-auto my-4 text-5xl font-bold text-text">Tasks</div>
      <div className="flex w-full font-medium text-neutral-900">
        <div className="mx-auto mb-3 flex h-16 w-11/12 rounded-full bg-secondary md:w-6/12">
          <div className="m-auto flex h-16 w-11/12">
            <div
              className={"m-auto flex h-[70%] min-w-[28%] rounded-full   px-4  text-xl  " + (activeTab === 1 ? "bg-accent font-semibold text-background " : "text-primary")}
              onClick={() => setActiveTab(1)}
            >
              <p className="m-auto">Today</p>
            </div>
            <div
              className={"m-auto flex h-[70%] min-w-[32%] rounded-full px-4  text-xl  " + (activeTab === 2 ? "bg-accent font-semibold text-background" : "text-primary")}
              onClick={() => setActiveTab(2)}
            >
              <p className="m-auto">Untimed</p>
            </div>
            <div
              className={"m-auto flex h-[70%] min-w-[23%] rounded-full  px-4   text-xl  " + (activeTab === 3 ? "bg-accent font-semibold text-background" : "text-primary")}
              onClick={() => setActiveTab(3)}
            >
              <p className="m-auto">All</p>
            </div>
          </div>
        </div>
      </div>
      <AddItemButton onClick={() => setAddingThings(true)} />
      <ScrollArea className="mx-auto mb-4 w-11/12 h-[55vh]">
        {activeTab == 1
          ? queryList.todays.map((item) => <TodoItem item={item} key={item.id + "1"} updateList={getUserTodos} />)
          : activeTab == 2
            ? queryList.general.map((item) => <TodoItem item={item} key={item.id + "2"} updateList={getUserTodos} />)
            : queryList.overall.map((item) => <TodoItem item={item} key={item.id + "3"} updateList={getUserTodos} />)}
      </ScrollArea>
    </div>
  );
}
