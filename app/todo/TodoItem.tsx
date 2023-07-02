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
} from "../utilityComponents/alertDialog";
import Image from "next/image";
import AddModal from "./AddModal";
import { Todo } from "utils/types";

export default function TodoItem(props: { item: Todo; updateList: () => void }) {
  const item = props.item;
  const [editing, setEditing] = useState(false);

  const [flipCaret, setFlipCaret] = useState(false);
  const [crossed, setCrossed] = useState(false);
  const crossout = () => {
    setCrossed((prev) => !prev);
  };
  const deleteItem = () => {
    //TODO
  };
  const toggleEditing = () => {
    setEditing((prev) => !prev);
  };
  return (
    <div className="relative flex min-h-[48px] w-full break-normal rounded-md text-3xl hover:bg-neutral-300">
      <div className="mr-auto flex w-full flex-col">
        <div
          className={
            "my-auto mb-auto flex break-normal font-bold" +
            (crossed ? "line-through " : "") +
            (item.nextShow != undefined
              ? item.nextShow?.valueOf() < new Date(new Date().setUTCHours(4, 0, 0, 0)).valueOf()
                ? "text-orange-900 "
                : item.priority
                ? " text-green-800 "
                : ""
              : "")
          }
        >
          <Image
            alt=""
            className="my-auto mr-2 hover:cursor-pointer"
            src={crossed ? "/check-circle-filled.svg" : "/check-circle.svg"}
            onClick={() => crossout()}
            height={28}
            width={28}
          />
          <div className="overflow-hidden max-sm:max-w-[69vw]">
            {item.title}

            {item.tasks != null && item.tasks.length != 0 ? (
              <Image
                alt=""
                src="caret-down.svg"
                height={24}
                width={24}
                onClick={() => {
                  setFlipCaret(!flipCaret);
                }}
                className={" " + (flipCaret ? "rotate-180" : "")}
              />
            ) : null}
          </div>
        </div>
        {flipCaret
          ? item.tasks.map((i) => (
              <div key={i.id} className="break-normal pl-12">
                -{i.title}
              </div>
            ))
          : null}
      </div>
      <div className="static float-right flex">
        <Image alt="" className=" mx-1 my-auto min-w-[32px] hover:cursor-pointer" src="/edit.svg" height={32} width={32} onClick={() => toggleEditing()} />
        {editing ? <AddModal toggle={toggleEditing} updateList={props.updateList} item={item} /> : null}
        <AlertDialog>
          <AlertDialogTrigger>
            <Image alt="" className="my-auto mr-2 min-w-[32px] hover:cursor-pointer" src="/trash.svg" height={32} width={32} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete your item series.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteItem()}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
