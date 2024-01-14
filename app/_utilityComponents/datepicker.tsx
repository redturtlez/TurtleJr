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
import { Cross } from "public/svg";

export function DatePicker(props: { defaultDate: Date }) {
  const todoStore = useTodoStore();
  const [date, setDate] = React.useState<Date>(props.defaultDate);
  const update = (e: Date) => {
    setDate(e);
    todoStore.setDate(e);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={"outline"} className={cn("w-full justify-center text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? date.toLocaleDateString("en-US", { dateStyle: "medium" }) : <span>Select a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={(e) => update(e)} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
