"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "utils/cnhelper";
import Image from "next/image";
import { Cross } from "public/svg";
import { useTodoStore } from "app/_context/todoStates";

export function DatePicker() {
  const todoStore = useTodoStore();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={"outline"} className={cn("w-full justify-center text-left font-normal", !todoStore.setNextShow && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {todoStore.nextShow ? todoStore.nextShow.toLocaleDateString("en-US", { dateStyle: "medium" }) : <span>Select a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={todoStore.nextShow} onSelect={todoStore.setNextShow} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
