"use client";
import { useEffect, useState } from "react";
import { DatePicker } from "../_utilityComponents/datepicker";
import { ScrollArea } from "../_utilityComponents/scrollarea";
import { Button } from "../_utilityComponents/button";
import { TitleInput } from "../_utilityComponents/titleinput";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../_utilityComponents/select";
import { Todos, saveTodos } from "./todoServer";

import { Cross, Plus } from "public/svg";
import MyCheckbox from "app/_utilityComponents/mycheckbox";
import { Slider } from "app/_utilityComponents/slider";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { useTodoStore } from "@/app/todo/todoStates";
import { Input } from "app/_utilityComponents/inputComponent";
import { Textarea } from "app/_utilityComponents/textarea";
import { Switch } from "app/_utilityComponents/switch";

export default function AddModal() {
  const todoStore = useTodoStore();
  const [disableButton, setDisableButton] = useState(false);
  const addToDb = async () => {
    if (todoStore.title.length == 0) {
      toast.error("Title must be atlast 1 character");
    } else {
      setDisableButton(true);
      const save = await saveTodos({
        userid: todoStore.userid,
        todos: todoStore.pushTodo(),
      });
      if (typeof save == "string") {
        toast.error(save);
      } else {
        toast.success("Successfully saved");
        todoStore.setTodos(save?.todos as Todos);
        todoStore.resetTodo();
        todoStore.flipModal();
      }
      setDisableButton(false);
    }
  };
  useEffect(() => {}, []);
  return (
    <div className="text-text fixed top-0 left-0 z-5 flex h-screen w-screen">
      <div
        className="bg-opacity-70 fixed top-0 left-0 h-screen w-screen bg-black"
        onClick={() => {
          todoStore.flipModal();
        }}
      ></div>
      <div className="bg-secondary relative m-auto flex max-h-[80%] w-[90%] flex-col rounded-xl sm:w-3/5">
        <Cross
          alt={""}
          width={24}
          height={24}
          className="fill-text absolute top-4 right-4"
          onClick={() => {
            todoStore.flipModal();
          }}
        />
        <div className="m-auto flex w-4/5 flex-col">
          <div className="mt-6 mb-4 text-xl font-semibold">Add New Task</div>
          {/* <TitleInput
            placeholder="Title"
            className="mx-auto h-14 text-3xl"
            onChange={(e) => (todoStore.title = e.target.value)}
            defaultValue={todoStore.title}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
          /> */}

          <label>Title</label>
          <Input
            placeholder="Enter task title"
            defaultValue={todoStore.title}
            className="border-primary/70 placeholder:text-primary/70 mt-2 mb-4 pr-10"
            onChange={(e) => (todoStore.title = e.target.value)}
          />
          <label>Details</label>
          <Textarea
            rows={3}
            placeholder="Add task details"
            className="border-primary/70 placeholder:text-primary/70 mt-2 mb-4 resize-none rounded-md border-1 bg-transparent whitespace-pre-wrap"
            value={todoStore.tasksNew != null ? todoStore.tasksNew : ""}
            onChange={(e) => todoStore.updateTaskNew(e.target.value)}
          />

          <label> Priority</label>
          <Slider defaultValue={[todoStore.priority]} max={3} min={1} step={1} className="mt-2 mb-4" onValueChange={(e) => todoStore.setPriority(e[0])} />
          <div className="mb-4 flex h-8 items-center">
            <Switch className="mr-2" id="timed" checked={todoStore.timed} onClick={() => todoStore.flipTimed()} />
            <label>Timed?</label>
            {todoStore.timed && (
              <div className="mr-0 ml-2 grow">
                <DatePicker />
              </div>
            )}
          </div>
          <div className={cn("mb-4 flex h-8", !todoStore.timed ? "opacity-30" : "")}>
            <Switch
              className="mr-2"
              id="repeatable"
              checked={todoStore.repeatable}
              onClick={() => {
                todoStore.flipRepeatable();
              }}
              disabled={!todoStore.timed}
            />
            <label>Repeatable?</label>
            {todoStore.repeatable && (
              <Select onValueChange={(e) => todoStore.setFrequency(e)} value={todoStore.frequency == null ? "Daily" : todoStore.frequency}>
                <SelectTrigger className="ml-2 h-full w-1/3 grow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary text-text" ref={(ref) => ref?.addEventListener("touchend", (e) => e.preventDefault())}>
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
          <Button className="bg-accent text-background mb-4" onClick={() => addToDb()} disabled={disableButton}>
            {todoStore.activeTodo == -1 ? "Add" : "Update"}
          </Button>
        </div>
      </div>
    </div>
  );
}
