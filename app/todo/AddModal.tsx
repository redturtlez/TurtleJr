"use client";
import { useEffect, useState } from "react";
import { DatePicker } from "../_utilityComponents/datepicker";
import { ScrollArea } from "../_utilityComponents/scrollarea";
import { Button } from "../_utilityComponents/button";
import { TitleInput } from "../_utilityComponents/titleinput";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../_utilityComponents/select";
import { Todos, saveTodos } from "./todoServer";
import { useTodoStore } from "./todoStates";
import { Cross, Plus } from "public/svg";
import MyCheckbox from "app/_utilityComponents/mycheckbox";
import { Slider } from "app/_utilityComponents/slider";
import { cn } from "utils/cnhelper";
import { toast } from "react-toastify";

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
    <div className="fixed left-0 top-0 z-[5] flex h-screen w-screen text-text">
      <div
        className="fixed left-0 top-0 h-screen w-screen bg-black bg-opacity-70"
        onClick={() => {
          todoStore.flipModal();
        }}
      ></div>
      <div className="relative m-auto flex max-h-[80%] w-[90%] flex-col rounded-xl bg-secondary py-6 sm:w-3/5 ">
        <Cross
          alt={""}
          width={24}
          height={24}
          className="absolute right-4 top-4 fill-text "
          onClick={() => {
            todoStore.flipModal();
          }}
        />
        <div className="m-auto flex w-4/5 flex-col">
          <TitleInput
            placeholder="Title"
            className="mx-auto h-14 text-3xl"
            onChange={(e) => (todoStore.title = e.target.value)}
            defaultValue={todoStore.title}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
          />
          <div
            className="my-1 flex h-8 w-full cursor-pointer justify-center rounded-md  bg-text/80 "
            onClick={() => {
              todoStore.addTask();
            }}
          >
            <Plus height={16} width={16} className="h-auto w-auto fill-secondary" alt="" />
          </div>
          <ScrollArea className="mb-1 ">
            <div className="max-h-56">
              {todoStore.tasks != undefined
                ? todoStore.tasks.map((data, i) => {
                    return (
                      <div key={i} className="mt-4 flex rounded-md bg-text/50 py-2">
                        <Cross alt="" height={12} width={12} className="my-auto ml-2 cursor-pointer fill-background" onClick={() => todoStore.deleteTask(i)} />
                        <textarea
                          rows={1}
                          placeholder="add details here"
                          className=" border-b-0 placeholder:text-background/50 text-background bg-transparent whitespace-pre-wrap flex-grow mr-2 max-w-[64vw]"
                          value={data != null ? data : ""}
                          onChange={(e) => todoStore.updateTask(e.target.value, i)}
                        />
                      </div>
                    );
                  })
                : null}
            </div>
          </ScrollArea>
          <div className="m-1 flex h-8 w-full">
            <label className="my-auto text-base">Priority:</label>
            <Slider defaultValue={[todoStore.priority]} max={3} min={1} step={1} className="mx-auto basis-0 grow px-4" onValueChange={(e) => todoStore.setPriority(e[0])} />
          </div>
          <div className="m-1 flex h-8 items-center">
            <MyCheckbox label={"Timed?"} className="mr-4 text-base" onChange={() => todoStore.flipTimed()} checked={todoStore.timed} />
            {todoStore.timed && (
              <div className="mr-0 flex-grow">
                <DatePicker />
              </div>
            )}
          </div>
          <div className={cn("m-1 flex h-8 ", !todoStore.timed ? "opacity-30" : "")}>
            <MyCheckbox
              label={"Repeatable?"}
              className="mr-4 text-base"
              onChange={() => {
                todoStore.flipRepeatable();
              }}
              disabled={!todoStore.timed}
              checked={todoStore.repeatable}
            />
            {todoStore.repeatable && (
              <Select defaultValue={todoStore.frequency} onValueChange={(e) => todoStore.setFrequency(e)} value={todoStore.frequency}>
                <SelectTrigger className=" h-full w-1/3 flex-grow">
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

          <Button className="my-1 bg-accent text-background " onClick={() => addToDb()} disabled={disableButton}>
            {todoStore.activeTodo == -1 ? "Add" : "Update"}
          </Button>
        </div>
      </div>
    </div>
  );
}
