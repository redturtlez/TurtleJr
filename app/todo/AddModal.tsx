"use client";
import { ChangeEvent, Reducer, useEffect, useReducer, useState } from "react";

import { toast } from "react-toastify";

import { DatePicker } from "../_utilityComponents/datepicker";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { ScrollArea } from "../_utilityComponents/scrollarea";
import { Button } from "../_utilityComponents/button";
import { TitleInput } from "../_utilityComponents/titleinput";
import { Checkbox } from "../_utilityComponents/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../_utilityComponents/select";
import { Todo } from "../../utils/types";
import { saveTodo, updateTodo } from "./todoServer";
import { useTodoStore } from "./todoStates";
import { Cross } from "public/svg";

export default function AddModal(props: { toggle: () => void; updateList: () => void; item?: Todo }) {
  const todoStore = useTodoStore();

  const user = useUser();
  const addToDb = async () => {
    const newTodo = {
      id: props.item != null ? props.item.id : undefined,
      title: todoStore.todoTitle.length == 0 ? "Untitled" : todoStore.todoTitle,
      priority: todoStore.priority,
      userid: user.user?.id,
      tasks: todoStore.tasks,
      frequency: todoStore.frequency,
      nextShow: todoStore.date,
    };
    if (props.item != null) {
      if (await updateTodo(newTodo)) {
        props.updateList();
        props.toggle();
        toast.success("Succesfully saved");
      } else {
        toast.error("Failed due to rate limit");
      }
    } else {
      if (await saveTodo(newTodo)) {
        props.updateList();
        props.toggle();
        toast.success("Succesfully saved");
      } else {
        toast.error("Failed due to rate limit");
      }
    }
  };
  useEffect(() => {
    props.item != undefined ? todoStore.importItem(props.item) : todoStore.reset();
  }, []);
  return (
    <div className="fixed left-0 top-0 z-[5] flex h-screen w-screen text-text">
      <div className="fixed left-0 top-0 h-screen w-screen bg-black bg-opacity-70 " onMouseDown={() => props.toggle()}></div>
      <div className="relative m-auto flex max-h-[100%] w-[90%] flex-col rounded-xl bg-secondary py-6 sm:w-3/5 ">
        <Cross alt={""} width={24} height={24} className="absolute right-4 top-4 fill-text " onClick={() => props.toggle()} />
        <div className="m-auto flex w-4/5 flex-col">
          <TitleInput type="text" placeholder="Title" value={todoStore.todoTitle} className="mx-auto h-14 text-3xl " onChange={(e) => todoStore.setTodoTitle(e.target.value)} />
          <div
            className="my-1 flex h-8 w-full cursor-pointer justify-center rounded-md  bg-text/80 "
            onClick={() => {
              todoStore.addTask();
            }}
          >
            <Image src="plus.svg" height={10} width={10} className="" alt="" />
          </div>
          <ScrollArea className="mb-1">
            <div className=" h-auto max-h-[50vh]">
              {todoStore.tasks.map((data, i) => {
                return (
                  <div key={i} className="mt-4 flex rounded-md bg-text/50 py-2">
                    <Cross alt="" height={12} width={12} className="my-auto ml-2 cursor-pointer fill-background" onClick={() => todoStore.deleteTask(i)} />
                    <textarea
                      rows={3}
                      placeholder="add details here"
                      className=" border-b-0 placeholder:text-background/50 text-background bg-transparent whitespace-pre-wrap flex-grow mr-2 max-w-[64vw]"
                      value={data.title != null ? data.title : ""}
                      onChange={(e) => todoStore.updateTask({ e, i })}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="m-1 flex h-8 items-center">
            <Checkbox className="my-auto mr-2 " id="dateBox" checked={todoStore.date != null} onClick={() => todoStore.setTimed()} />
            <label className="my-auto text-base mr-4" htmlFor="dateBox">
              Timed?
            </label>
            {todoStore.date != null && (
              <div className="mr-0 flex-grow">
                <DatePicker defaultDate={props.item != undefined ? props.item.nextShow : todoStore.date} />
              </div>
            )}
          </div>

          <div className="m-1 flex h-8 ">
            <Checkbox id="repeatableBox" className="my-auto mr-1" checked={todoStore.frequency != null} onClick={() => todoStore.setRepeatable()} />
            <label className="my-auto text-base mr-4" htmlFor="repeatableBox">
              Repeatable?
            </label>
            {todoStore.frequency != null && (
              <Select onValueChange={(e) => todoStore.setFrequency(e)} value={todoStore.frequency}>
                <SelectTrigger className=" h-full w-1/3 flex-grow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary text-text">
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
          <div className="m-1 flex h-8">
            <Checkbox className="my-auto mr-1" id="priorityBox" checked={todoStore.priority} onClick={() => todoStore.setPriority()} />
            <label className="my-auto text-base" htmlFor="priorityBox">
              Priority?
            </label>
          </div>
          <Button className="my-1 bg-accent text-background " onClick={() => addToDb()}>
            {props.item != null ? "Update" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
