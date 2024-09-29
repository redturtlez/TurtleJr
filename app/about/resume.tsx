"use client";
import { ScrollArea } from "app/_utilityComponents/scrollarea";
import { Cross } from "public/svg";
import { useState } from "react";

export default function Resume() {
  const [hide, setHide] = useState(true);
  return (
    <>
      <div
        className="mx-auto h-8 w-fit text-accent"
        onClick={() => {
          setHide(false);
        }}
      >
        Click here to view my resume
      </div>
      <div className="absolute h-full w-full bg-black/80" hidden={hide}>
        <Cross
          alt={""}
          width={24}
          height={24}
          className="m-4 ml-auto fill-text"
          onClick={() => {
            setHide(true);
          }}
        />

        <object type="application/pdf" data="/my-resume-2024.pdf" width="100%" height="90%">
          <div className="pt-24 text-center text-3xl">Your browser does not have a PDF viewer</div>
        </object>
      </div>
    </>
  );
}
