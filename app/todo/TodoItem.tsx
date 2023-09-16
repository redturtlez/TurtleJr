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
import Image from "next/image";
import AddModal from "./AddModal";
import { Todo } from "utils/types";
import { deleteTodo } from "./todoServer";
import { CaretDown } from "public/svg";

export default function TodoItem(props: { item: Todo; updateList: () => void }) {
  const item = props.item;
  const [editing, setEditing] = useState(false);

  const [flipCaret, setFlipCaret] = useState(false);
  const [crossed, setCrossed] = useState(false);
  const crossout = () => {
    setCrossed((prev) => !prev);
  };
  const deleteItem = (id) => {
    deleteTodo(id);
    props.updateList();
  };
  const toggleEditing = () => {
    setEditing(false);
  };
  return (
    <div
      className={"relative m-2 flex min-h-[8vh] break-normal rounded-2xl  p-2 text-3xl " + (crossed ? " bg-[#def2de]/70 text-neutral-700 line-through " : " bg-text text-black ")}
    >
      <div className="mr-auto flex w-full">
        <div className={"my-auto flex break-normal text-xl font-bold "}>
          <Image
            alt=""
            className={"my-auto mr-2 hover:cursor-pointer " + (crossed ? " opacity-70" : "")}
            src={crossed ? "/check-circle-filled.svg" : "/check-circle.svg"}
            onClick={() => crossout()}
            height={28}
            width={28}
          />
          <div
            className={"max-w-[55vw] overflow-hidden" + (item.priority ? " text-green-800 " : " ")}
            onClick={() => {
              setFlipCaret(!flipCaret);
            }}
          >
            {item.title}
            {flipCaret
              ? item.tasks.map((i) => (
                  <div key={i.id} className="flex max-w-full  font-normal  [text-wrap:balance]">
                    -{i.title}
                  </div>
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
            className={"h-full min-w-[25px] fill-black " + (flipCaret ? "rotate-180 " : "") + (crossed ? " opacity-70 " : "")}
          />
        ) : null}
      </div>
      <div className="static float-right flex">
        <Image
          alt=""
          className={"mx-1 my-auto min-w-[26px] hover:cursor-pointer " + (crossed ? " opacity-70 " : "")}
          src="/edit.svg"
          height={26}
          width={26}
          onClick={() => setEditing(true)}
        />
        {editing ? <AddModal toggle={toggleEditing} updateList={props.updateList} item={item} /> : null}
        <AlertDialog>
          <AlertDialogTrigger>
            <Image alt="" className={"my-auto min-w-[26px] stroke-stone-600 hover:cursor-pointer " + (crossed ? " opacity-70 " : "")} src="/trash.svg" height={26} width={26} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete your item series.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteItem(item.id)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
