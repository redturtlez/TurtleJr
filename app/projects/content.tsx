"use client";
import { Arrow } from "public/svg";
import { useState } from "react";
const jobs = [
  {
    title: "Fedex Ground",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    url: "/fedex",
  },
  {
    title: "Professional1",
    desc: "Professional1",
    url: "/pro1",
  },
];
const hobbies = [
  {
    title: "Turtle Jr Jones",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    url: "/turtlejr",
  },
  {
    title: "Hobby1",
    desc: "Hobby1",
    url: "/hobby1",
  },
];
export default function Content() {
  const [tab, setTab] = useState(1);
  const [currentJob, setCurrentJob] = useState(0);
  const [currentHobby, setCurrentHobby] = useState(0);
  const [activeList, setActiveList] = useState(jobs);
  function activePage() {
    if (tab == 1) {
      return currentJob;
    }
    if (tab == 2) {
      return currentHobby;
    }
  }
  function changePage(x: number) {
    if (tab == 1) {
      setCurrentJob((prev) => (prev + x < 0 ? jobs.length - 1 : prev + x > jobs.length - 1 ? 0 : prev + x));
    }
    if (tab == 2) {
      setCurrentHobby((prev) => (prev + x < 0 ? jobs.length - 1 : prev + x > jobs.length - 1 ? 0 : prev + x));
    }
  }
  return (
    <>
      <div className="flex w-screen flex-col ">
        <div className="flex h-14 w-72 justify-evenly self-center rounded-full bg-secondary py-2 text-lg">
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 1 ? "bg-accent/80 font-semibold text-text " : " text-accent")}
            onClick={() => {
              setTab(1);
              setActiveList(jobs);
            }}
          >
            Professional
          </div>
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (tab == 2 ? "bg-accent/80 font-semibold text-text " : " text-accent ")}
            onClick={() => {
              setTab(2);
              setActiveList(hobbies);
            }}
          >
            Personal
          </div>
        </div>
        <div className="w-11/12 flex flex-col bg-secondary rounded-xl m-auto mt-4 pt-4">
          <div className="w-11/12  self-center pb-4 text-2xl font-bold text-accent"> {activeList.at(activePage()).title}</div>
          <div className="h-64 w-11/12 self-center overflow-y-auto text-xl">{activeList.at(activePage()).desc}</div>
          <a href={activeList.at(activePage()).url} className="m-4 h-12 w-32 self-center rounded-lg bg-accent/80 p-3 text-center ">
            Read More
          </a>
        </div>
      </div>
      <div className="flex w-full m-auto">
        <Arrow className="ml-4 mr-auto w-auto h-8 -rotate-90 fill-accent " onClick={() => changePage(-1)} />
        <Arrow className="mr-4 ml-auto w-auto h-8 rotate-90 fill-accent" onClick={() => changePage(1)} />
      </div>
    </>
  );
}
