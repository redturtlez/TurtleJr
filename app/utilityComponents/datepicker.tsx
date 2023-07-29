"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "utils/cnhelper";
import Image from "next/image";
import { useTodoStore } from "app/todo/todoStates";

export function DatePicker(props: { setDate: ({}: any) => void; defaultDate: Date }) {
  const todoStore = useTodoStore();
  const [date, setDate] = React.useState<Date>(props.defaultDate);
  const update = (e: Date) => {
    setDate(e);
    todoStore.setDate(e);
  };
  return (
    <div className="flex">
      <Image alt="" src="cross.svg" height={12} width={12} className="mx-2 my-auto cursor-pointer" onClick={() => update(null)} />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"outline"} className={cn("w-[130px] justify-start p-2 text-left font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? date.toLocaleDateString("en-US", { dateStyle: "medium" }) : <span>Select a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={(e) => update(e)} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );
}
