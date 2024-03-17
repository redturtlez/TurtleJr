import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../_utilityComponents/alertDialog";
import AddModal from "./AddModal";
import { CaretDown, CheckFilled, CheckUnfilled, Edit, Trash } from "public/svg";
import { Todo, Todos, saveTodos } from "./todoServer";
import { useTodoStore } from "./todoStates";
import { toast } from "react-toastify";
import { cn } from "utils/cnhelper";

export default function TodoItem(props: { item: Todo; id: number }) {
  const todoStore = useTodoStore();
  const item = props.item;
  const [flipCaret, setFlipCaret] = useState(false);
  const [crossed, setCrossed] = useState(false);
  const crossout = () => {
    setCrossed((prev) => !prev);
  };
  const deleteItem = async (id) => {
    todoStore.setActiveTodo(props.id);
    todoStore.deleteTodo(id);
    const save = await saveTodos({
      userid: todoStore.userid,
      todos: todoStore.todos,
    });
    if (typeof save == "string") {
      toast.error(save);
    } else {
      toast.success("Successfully Deleted", {
        autoClose: 1000,
      });
      todoStore.setTodos(save?.todos as Todos);
      todoStore.resetTodo();
    }
  };
  return (
    <div
      className={
        "relative m-2 flex min-h-[8vh] rounded-2xl  bg-secondary fill-accent p-2 text-3xl font-semibold text-text " + (crossed ? " line-through " : " ")
        // +
        // (item.priority ? " fill-accent text-accent " : " fill-text text-text")
      }
    >
      <div className={"flex w-full "}>
        <div className={"my-auto flex text-xl"}>
          {crossed ? (
            <CheckFilled alt="" className={"my-auto mr-2 min-w-[26px]  hover:cursor-pointer "} onClick={() => crossout()} height={28} width={28} />
          ) : (
            <CheckUnfilled alt="" className={"my-auto mr-2 min-w-[26px] hover:cursor-pointer "} onClick={() => crossout()} height={28} width={28} />
          )}
          <div
            className={cn("overflow-hidden w-full", flipCaret ? "grow basis-0 w-[100vw]" : "")}
            onClick={() => {
              setFlipCaret(!flipCaret);
            }}
          >
            {item.title}
            {flipCaret
              ? item.tasks?.map((i, index) => (
                  <label key={index} className="flex text-balance text-text bg-transparent font-normal whitespace-pre-wrap ">
                    {"-" + i}
                  </label>
                ))
              : null}
          </div>
        </div>
        {item.tasks != null && item.tasks.length != 0 ? (
          <CaretDown
            height={24}
            width={24}
            onClick={() => {
              setFlipCaret(!flipCaret);
            }}
            className={"h-full min-w-[25px] fill-text " + (flipCaret ? "rotate-180 " : "")}
          />
        ) : null}
      </div>
      <div className="static float-right flex min-w-fit ">
        <Edit
          alt=""
          className={"mx-1 my-auto fill-accent/50 hover:cursor-pointer "}
          height={26}
          width={26}
          onClick={() => {
            todoStore.setActiveTodo(props.id);
            todoStore.flipModal();
          }}
        />
        <AlertDialog>
          <AlertDialogTrigger>
            <Trash alt="" className={"my-auto  fill-red-500 hover:cursor-pointer "} height={26} width={26} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete your item series.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteItem(props.id)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
