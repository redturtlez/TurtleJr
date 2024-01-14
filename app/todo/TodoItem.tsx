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
import { CaretDown, CheckFilled, CheckUnfilled, Edit, Trash } from "public/svg";

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
      className={
        "relative m-2 flex min-h-[8vh] max-w-full break-normal rounded-2xl  bg-secondary fill-accent p-2 text-3xl font-semibold text-text " + (crossed ? " line-through " : " ")
        // +
        // (item.priority ? " fill-accent text-accent " : " fill-text text-text")
      }
    >
      <div className={"flex w-full "}>
        <div className={"my-auto flex max-w-full break-normal text-xl"}>
          {crossed ? (
            <CheckFilled alt="" className={"my-auto mr-2 min-w-[26px]  hover:cursor-pointer "} onClick={() => crossout()} height={28} width={28} />
          ) : (
            <CheckUnfilled alt="" className={"my-auto mr-2 min-w-[26px] hover:cursor-pointer "} onClick={() => crossout()} height={28} width={28} />
          )}
          <div
            className={"max-w-full overflow-hidden "}
            onClick={() => {
              setFlipCaret(!flipCaret);
            }}
          >
            {item.title}
            {flipCaret
              ? item.tasks.map((i) => (
                  <textarea
                    key={i.id}
                    className="flex text-balance text-text bg-transparent break-words font-normal whitespace-pre-wrap max-w-[50vw] resize-none"
                    value={"-" + i.title}
                  ></textarea>
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
        <Edit alt="" className={"mx-1 my-auto fill-accent/50 hover:cursor-pointer "} height={26} width={26} onClick={() => setEditing(true)} />
        {editing ? <AddModal toggle={toggleEditing} updateList={props.updateList} item={item} /> : null}
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
              <AlertDialogAction onClick={() => deleteItem(item.id)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
