"use client";
import { ChangeEvent, Reducer, useReducer, useState } from "react";

import { toast } from "react-toastify";

import { DatePicker } from "../utilityComponents/datepicker";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { ScrollArea } from "../utilityComponents/scrollarea";
import { Button } from "../utilityComponents/button";
import { TitleInput } from "../utilityComponents/titleinput";
import { Checkbox } from "../utilityComponents/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../utilityComponents/select";
import { Todo } from "../../utils/types";
import { saveTodo, updateTodo } from "./todoServer";
import { Task } from "@prisma/client";
import { useTodoStore } from "./todoStates";

export default function AddModal(props: { toggle: () => void; updateList: () => void; item?: Todo }) {
  const todoStore = useTodoStore();
  const user = useUser();
  const addToDb = () => {
    if (todoStore.todoTitle.length == 0) {
      toast.error("Title cant be empty");
    } else {
      todoStore.tasks.map((item, i) => {
        const newTasks: Task[] = [];
        if (item.title != "") {
          newTasks.push(item);
        }
        todoStore.setTasks(newTasks);
      });
      const newTodo = {
        id: props.item != null ? props.item.id : undefined,
        title: todoStore.todoTitle,
        priority: todoStore.priority,
        userid: user.user?.id,
        tasks: todoStore.tasks,
        frequency: todoStore.frequency,
        nextShow: todoStore.date,
      };
      if (props.item != null) {
        updateTodo(newTodo);
      } else {
        saveTodo(newTodo);
      }
      toast.success("Succesfully saved");
    }
  };

  return (
    <div className={"fixed left-0 top-0 z-50 flex h-screen w-screen"}>
      <div className="fixed left-0 top-0  h-screen w-screen bg-black bg-opacity-70 " onMouseDown={() => props.toggle()}></div>
      <div className="fixed left-[20%] top-[20%] flex h-3/5 w-3/5 bg-gray-400 max-sm:left-0 max-sm:top-[10%] max-sm:h-4/5 max-sm:w-screen">
        <Image src="./cross.svg" alt={""} width={30} height={30} className="absolute right-2 top-2" onClick={() => props.toggle()} />
        <div className="m-auto flex h-[80%] w-3/5 flex-col max-sm:w-4/5">
          <TitleInput
            type="text"
            placeholder="Title"
            defaultValue={todoStore.todoTitle}
            className="mx-auto h-14 text-3xl"
            onChange={(e) => todoStore.setTodoTitle(e.target.value)}
          />
          <div
            className="mt-2  flex h-6 w-full cursor-pointer justify-center rounded-md border border-neutral-500 bg-slate-200"
            onClick={() => {
              todoStore.addTask();
            }}
          >
            <Image src="plus.svg" height={10} width={10} className="" alt="" />
          </div>
          <ScrollArea className="mb-2">
            {todoStore.tasks.map((data, i) => {
              return (
                <div key={i} className="mt-4 flex rounded-md bg-slate-200">
                  <Image alt="" src="cross.svg" height={12} width={12} className="my-auto ml-2 cursor-pointer " onClick={() => todoStore.deleteTask(i)} />
                  <TitleInput
                    type="text"
                    placeholder="add Task"
                    className=" border-b-0"
                    value={data.title != null ? data.title : ""}
                    onChange={(e) => todoStore.updateTask({ e, i })}
                  />
                </div>
              );
            })}
          </ScrollArea>
          <DatePicker setDate={todoStore.setDate} />
          <div className="mb-2-auto flex h-8 align-middle">
            <Checkbox className="my-auto mr-1 " id="priorityBox" defaultChecked={todoStore.priority} onClick={() => todoStore.setPriority()} />
            <label className="my-auto text-base" htmlFor="priorityBox">
              Priority?
            </label>
          </div>
          <div className="mb-auto flex h-8">
            <Checkbox id="repeatableBox" className="my-auto mr-1" defaultChecked={todoStore.frequency != null} onClick={() => todoStore.setRepeatable()} />
            <label className="my-auto text-base" htmlFor="repeatableBox">
              Repeatable?
            </label>
            {todoStore.frequency != null && (
              <Select onValueChange={(e) => todoStore.setFrequency(e)} defaultValue={todoStore.frequency}>
                <SelectTrigger className="ml-2 h-full w-1/3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-400">
                  <SelectGroup>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
          <Button className="my-2 bg-green-700" onClick={() => addToDb()}>
            {props.item != null ? "Update" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
